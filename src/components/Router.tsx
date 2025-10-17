import { ReactNode, useState, useEffect } from 'react';

interface Route {
  path: string;
  component: ReactNode;
}

interface RouterProps {
  routes: Route[];
}

export function Router({ routes }: RouterProps) {
  const [currentPath, setCurrentPath] = useState(window.location.pathname);

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const matchRoute = () => {
    for (const route of routes) {
      if (route.path === currentPath) {
        return route.component;
      }

      const pathParts = route.path.split('/');
      const currentParts = currentPath.split('/');

      if (pathParts.length === currentParts.length) {
        let match = true;
        for (let i = 0; i < pathParts.length; i++) {
          if (pathParts[i].startsWith(':')) {
            continue;
          }
          if (pathParts[i] !== currentParts[i]) {
            match = false;
            break;
          }
        }
        if (match) {
          return route.component;
        }
      }
    }

    return <div className="p-8 text-center">404 - Page Not Found</div>;
  };

  return <>{matchRoute()}</>;
}
