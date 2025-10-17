import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { classifyTicket, checkDuplicateTickets } from '../lib/api';
import { Upload, Send, AlertCircle } from 'lucide-react';

export function Submit() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    subject: '',
    description: '',
  });
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<Array<{ id: string; subject: string }>>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const duplicateTickets = await checkDuplicateTickets(formData.subject, formData.email);

      if (duplicateTickets.length > 0) {
        setDuplicates(duplicateTickets);
        setLoading(false);
        return;
      }

      let attachmentUrl = null;

      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Math.random()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('ticket-attachments')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('ticket-attachments')
          .getPublicUrl(fileName);

        attachmentUrl = urlData.publicUrl;
      }

      const { data: ticket, error: ticketError } = await supabase
        .from('tickets')
        .insert({
          requester_name: formData.name,
          requester_email: formData.email,
          subject: formData.subject,
          body: formData.description,
          attachment_url: attachmentUrl,
        })
        .select()
        .single();

      if (ticketError) throw ticketError;

      try {
        const classification = await classifyTicket(
          formData.subject,
          formData.description,
          formData.email
        );

        await supabase.from('tickets').update({
          category: classification.category,
          priority: classification.priority,
          language: classification.language,
        }).eq('id', ticket.id);

        await supabase.from('classifications').insert({
          ticket_id: ticket.id,
          model: 'gpt-4o-mini',
          label: classification.category,
          confidence: classification.confidence,
          rationale: classification.rationale,
        });

        if (classification.abuseDetected) {
          await supabase.from('tickets').update({
            category: 'abuse_report',
            priority: 'urgent',
          }).eq('id', ticket.id);
        }
      } catch (classifyError) {
        console.error('Classification failed:', classifyError);
      }

      setSuccess(true);
      setFormData({ name: '', email: '', subject: '', description: '' });
      setFile(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleIgnoreDuplicates = () => {
    setDuplicates([]);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Submit a Ticket</h1>
          <p className="text-slate-600">We're here to help. Tell us what you need.</p>
        </div>

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
            Ticket submitted successfully! We'll get back to you soon.
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
            {error}
          </div>
        )}

        {duplicates.length > 0 && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 mb-2">Similar tickets found</h3>
                <p className="text-sm text-amber-800 mb-3">
                  You have recent tickets with similar subjects:
                </p>
                <ul className="space-y-1 mb-3">
                  {duplicates.map(dup => (
                    <li key={dup.id} className="text-sm text-amber-800">
                      - {dup.subject}
                    </li>
                  ))}
                </ul>
                <button
                  onClick={handleIgnoreDuplicates}
                  className="text-sm text-amber-900 underline hover:no-underline"
                >
                  Submit anyway
                </button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-8 space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-2">
              Your Name
            </label>
            <input
              type="text"
              id="name"
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="John Doe"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              required
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="john@example.com"
            />
          </div>

          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-slate-700 mb-2">
              Subject
            </label>
            <input
              type="text"
              id="subject"
              required
              value={formData.subject}
              onChange={e => setFormData({ ...formData, subject: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition"
              placeholder="Brief description of your issue"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <textarea
              id="description"
              required
              rows={6}
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition resize-none"
              placeholder="Please provide as much detail as possible..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Attachment (optional)
            </label>
            <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-blue-400 transition">
              <input
                type="file"
                id="file"
                onChange={e => setFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <label htmlFor="file" className="cursor-pointer">
                <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                {file ? (
                  <p className="text-sm text-slate-700">{file.name}</p>
                ) : (
                  <p className="text-sm text-slate-500">Click to upload a file</p>
                )}
              </label>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-6 rounded-lg flex items-center justify-center gap-2 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              'Submitting...'
            ) : (
              <>
                <Send className="w-4 h-4" />
                Submit Ticket
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
