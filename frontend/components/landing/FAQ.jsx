'use client';

import React, { useState } from 'react';

const faqs = [
  {
    id: 'faq-ans-1',
    question: 'Do I need to install anything?',
    answer:
      'No. BashLab runs a genuine containerized Linux environment directly in your browser. All you need is an updated modern web browser.',
  },
  {
    id: 'faq-ans-2',
    question: 'Is my progress saved?',
    answer:
      'Yes. Your course completion, lesson milestones, and exercise checks are permanently tied to your learner account.',
  },
  {
    id: 'faq-ans-3',
    question: 'What happens when a practice session ends?',
    answer:
      'Practice sandboxes are ephemeral and automatically recycle after 10–15 minutes of inactivity to keep resources clean. Your learning progress remains permanently saved.',
  },
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(null);

  const toggleFaq = (index) => {
    setOpenIndex((prev) => (prev === index ? null : index));
  };

  return (
    <section
      id="faq"
      className="relative bg-[#0A0D14] py-14 sm:py-16 border-t"
      style={{ borderColor: '#39434F' }}
      aria-labelledby="faq-heading"
    >
      <div className="section-divider" style={{ backgroundColor: '#00E5FF' }} aria-hidden="true" />

      <div className="container">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-start">
          <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
            <div>
              <h2 id="faq-heading" className="heading-lg mb-4">
                Ready when you are.
              </h2>
              <p className="body-md max-w-[440px]">
                Zero local configuration, risk-free sandboxes, and tracked completion. Jump into an exercise whenever you are ready to experiment.
              </p>
            </div>

            <div className="pt-2">
              <a
                href="/courses"
                className="group inline-flex items-center gap-2 font-code text-sm text-primary uppercase tracking-wider font-semibold focus-visible"
              >
                <span className="group-hover:underline">EXPLORE COURSES</span>
                <span className="material-symbols-outlined text-sm">arrow_forward</span>
              </a>
            </div>
          </div>

          <div className="lg:col-span-7">
            <div className="divide-y border-y" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              {faqs.map((faq, index) => (
                <div key={faq.id} className="py-5">
                  <button
                    className="faq-toggle w-full flex items-center justify-between text-left group focus-visible"
                    onClick={() => toggleFaq(index)}
                    aria-expanded={openIndex === index}
                    aria-controls={faq.id}
                    type="button"
                  >
                    <span className="font-headline font-medium text-base sm:text-lg text-white group-hover:text-primary transition-colors">
                      {faq.question}
                    </span>
                    <span
                      className="faq-icon font-code text-xl text-outline group-hover:text-primary transition-colors ml-4 shrink-0"
                      aria-hidden="true"
                    >
                      {openIndex === index ? '−' : '+'}
                    </span>
                  </button>
                  <div
                    id={faq.id}
                    className={`faq-content pt-3 pr-6 text-sm font-body text-on-surface-variant leading-relaxed ${openIndex === index ? '' : 'hidden'}`}
                    role="region"
                    aria-labelledby={`faq-q-${index}`}
                  >
                    {faq.answer}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}