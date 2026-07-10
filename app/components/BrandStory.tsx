"use client";

import { brandStory } from "../data/brand";
import { useState } from "react";

export default function BrandStory() {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggle = (i: number) =>
    setExpandedIndex(expandedIndex === i ? null : i);

  return (
    <section className="brand-section">
      {/* Tagline */}
      <div className="brand-hero">
        <p className="brand-tagline-label">BRAND STORY</p>
        <h2 className="brand-tagline">{brandStory.tagline}</h2>
        <p className="brand-catch">{brandStory.catchCopy}</p>
      </div>

      {/* Timeline */}
      <div className="brand-timeline">
        <div className="timeline-line" />
        {brandStory.timeline.map((event, i) => {
          const isLast = i === brandStory.timeline.length - 1;
          const isOpen = expandedIndex === i;
          return (
            <div
              key={event.year}
              className={`timeline-node ${isOpen ? "open" : ""} ${
                isLast ? "last" : ""
              }`}
              onClick={() => toggle(i)}
            >
              <div className="timeline-dot" />
              <div className="timeline-content">
                <div className="timeline-header">
                  <span className="timeline-year">{event.year}</span>
                  <h3 className="timeline-title">{event.title}</h3>
                  <span className="timeline-chevron">
                    {isOpen ? "−" : "+"}
                  </span>
                </div>
                <div className="timeline-body">
                  <p>{event.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Values */}
      <div className="brand-values">
        <h3 className="values-title">企業理念</h3>
        <div className="values-grid">
          {brandStory.values.map((v) => (
            <div key={v.en} className="value-card">
              <span className="value-icon">{v.icon}</span>
              <p className="value-ja">{v.ja}</p>
              <p className="value-en">{v.en}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="brand-cta">
        <a href="/about" className="brand-about-link">
          AJAZZ について詳しく見る →
        </a>
      </div>
    </section>
  );
}
