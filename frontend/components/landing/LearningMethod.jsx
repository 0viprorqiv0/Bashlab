'use client';

import React from 'react';

const steps = [
  {
    number: '01.',
    color: 'text-primary',
    hover: 'group-hover:text-primary',
    title: 'Understand the command',
    description:
      'Location & navigation concept. Before executing scripts or manipulating files, you learn why knowing where you are matters and how paths resolve in Linux file trees.',
  },
  {
    number: '02.',
    color: 'text-secondary',
    hover: 'group-hover:text-secondary',
    title: 'Practice in real Bash',
    description:
      'Real isolated sandbox execution inside guided lessons. Type genuine commands directly into an ephemeral Linux environment running safely in your browser.',
  },
  {
    number: '03.',
    color: 'text-accent',
    hover: 'group-hover:text-accent-amber',
    title: 'Interpret feedback',
    description:
      'Requirement-level feedback on directory states and output. Automated verification confirms whether you moved, created, or piped the expected files correctly.',
    tag: 'Illustrative',
  },
];

export default function LearningMethod() {
  return (
    <section
      id="how-it-works"
      className="relative bg-[#0A0D14] py-14 sm:py-16 border-t"
      style={{ borderColor: '#39434F' }}
      aria-labelledby="learn-heading"
    >
      <div className="section-divider" style={{ backgroundColor: '#00E5FF' }} aria-hidden="true" />

      <div className="container">
        <div className="flex flex-col-reverse lg:flex-row gap-10 lg:gap-14 items-start">
          <div className="w-full lg:w-[58%]">
            <div className="divide-y border-y" style={{ borderColor: 'rgba(57, 67, 79, 0.4)' }}>
              {steps.map((step, index) => (
                <div key={index} className="py-6 group">
                  <div className="flex items-start gap-4">
                    <span className={`font-code font-bold text-sm tracking-wider mt-0.5 shrink-0 ${step.color}`}>
                      {step.number}
                    </span>
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <h3 className={`font-headline font-bold text-lg sm:text-xl text-white transition-colors ${step.hover}`}>
                          {step.title}
                        </h3>
                        {step.tag && (
                          <span className="tag tag-outline">{step.tag}</span>
                        )}
                      </div>
                      <p className="body-sm">{step.description}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="w-full lg:w-[42%] flex flex-col space-y-6">
            <div>
              <h2
                id="learn-heading"
                className="heading-lg mb-4"
              >
                Understand it. Try it. Make it stick.
              </h2>
              <p className="body-md">
                Curiosity gets you started, but deliberate feedback is how discovery turns into lasting shell muscle memory. Each lesson pairs conceptual mental models with guided execution.
              </p>
            </div>

            <div className="pt-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <p className="font-code text-xs sm:text-sm text-outline leading-relaxed">
                Shell 101 turns these small steps into a clear learning path.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}