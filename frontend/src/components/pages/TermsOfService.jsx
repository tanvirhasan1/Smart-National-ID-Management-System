import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import '../styles/TermsOfService.css';

const getLang = (language) => (language === 'bn' ? 'bn' : 'en');

function TermsOfService() {
  const { language, getTranslation } = useLanguage();
  const lang = getLang(language);
  const t = getTranslation('termsOfService');
  const pageTitle = t.title || 'Terms of Service';
  const sections = Array.isArray(t.sections) ? t.sections : [];
  const [activeSection, setActiveSection] = useState(sections[0]?.id || 'introduction');

  const handleTocClick = (sectionId) => {
    setActiveSection(sectionId);
  };

  return (
    <main className={`terms-service-page terms-service-page--${lang}`}>
      <section className="terms-service-hero" aria-labelledby="terms-service-title">
        <div className="terms-service-hero__inner">
          <p className="terms-service-updated">{t.updated}</p>
          <h1 id="terms-service-title">{pageTitle}</h1>
          <p className="terms-service-subtitle">{t.subtitle}</p>
        </div>
      </section>

      <section className="terms-service-content" aria-label={pageTitle}>
        <aside className="terms-service-toc" aria-label={t.toc}>
          <h2>{t.toc}</h2>
          <nav>
            {sections.map((section) => (
              <a
                key={section.id}
                className={activeSection === section.id ? 'is-active' : ''}
                href={`#${section.id}`}
                onClick={() => handleTocClick(section.id)}
              >
                {section.title}
              </a>
            ))}
          </nav>
        </aside>

        <article className="terms-service-article">
          <section className="terms-service-intro" id={sections[0]?.id || 'introduction'}>
            <h2>{t.introTitle}</h2>
            <p>{t.introLead}</p>
          </section>

          {sections.slice(1).map((section) => (
            <section className="terms-service-section" id={section.id} key={section.id}>
              <h2>{section.title}</h2>
              {section.paragraphs?.map((paragraph, index) => (
                <p key={`${section.id}-paragraph-${index}`}>{paragraph}</p>
              ))}
              {section.bullets?.length ? (
                <ul>
                  {section.bullets.map((bullet, index) => (
                    <li key={`${section.id}-bullet-${index}`}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </article>
      </section>
    </main>
  );
}

export default TermsOfService;
