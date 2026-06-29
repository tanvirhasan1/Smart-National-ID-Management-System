import React from 'react';
import '../styles/NotFound.css';

const NotFound = () => {
  return (
    <main className="not-found-minimal-page" aria-label="Page not found">
      <section className="not-found-minimal-content">
        <h1 className="not-found-minimal-code">404</h1>
        <h2 className="not-found-minimal-title">Page not found</h2>
        <p className="not-found-minimal-message">
          The page you are looking for doesn&apos;t exist or an error occurred.
        </p>
      </section>
    </main>
  );
};

export default NotFound;
