import React, { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';
import '../styles/PrivacyPolicy.css';

const getLang = (language) => (language === 'bn' ? 'bn' : 'en');

function PrivacyPolicy() {
  const { language, getTranslation } = useLanguage();
  const lang = getLang(language);
  const t = getTranslation('privacyPolicy');
  const pageTitle = t.title || 'Privacy Policy';
  const sections = Array.isArray(t.sections) ? t.sections : [];
  const [activeSection, setActiveSection] = useState(sections[0]?.id || 'introduction');

  const handleTocClick = (sectionId) => {
    setActiveSection(sectionId);
  };

  return (
    <main className={`privacy-policy-page privacy-policy-page--${lang}`}>
      <section className="privacy-policy-hero" aria-labelledby="privacy-policy-title">
        <div className="privacy-policy-hero__inner">
          <p className="privacy-policy-updated">{t.updated}</p>
          <h1 id="privacy-policy-title">{pageTitle}</h1>
          <p className="privacy-policy-subtitle">{t.subtitle}</p>
        </div>
      </section>

      <section className="privacy-policy-content" aria-label={pageTitle}>
        <aside className="privacy-policy-toc" aria-label={t.toc}>
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

        <article className="privacy-policy-article">
          <section className="privacy-policy-intro" id={sections[0]?.id || 'introduction'}>
            <h2>{t.introTitle}</h2>
            <p>{t.introLead}</p>
          </section>

          {sections.slice(1).map((section) => (
            <section className="privacy-policy-section" id={section.id} key={section.id}>
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

export default PrivacyPolicy;
