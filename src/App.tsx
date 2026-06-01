import { lazy, Suspense, useEffect, useState } from "react";
import { sampleReviews } from "./data/sampleReviews";
import type { ReviewsDataset } from "./types";

type ActiveTab = "intro" | "globe" | "motivation";
const GlobeExperience = lazy(() => import("./components/GlobeExperience"));

const numberFormatter = new Intl.NumberFormat("en-US");

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("intro");
  const [dataset, setDataset] = useState<ReviewsDataset>(sampleReviews);

  useEffect(() => {
    let cancelled = false;

    fetch("/generated/reviews.json")
      .then((response) => (response.ok ? response.json() : null))
      .then((generatedDataset: ReviewsDataset | null) => {
        if (!cancelled && generatedDataset?.reviews?.length) {
          setDataset(generatedDataset);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className={`app-shell ${activeTab === "globe" ? "globe-mode" : ""}`}>
      <header className="site-header">
        <div>
          <h1>Google Reviews Globe</h1>
        </div>
        <nav className="tabs" aria-label="Primary navigation">
          <button
            className={activeTab === "intro" ? "active" : ""}
            onClick={() => setActiveTab("intro")}
            type="button"
          >
            Intro
          </button>
          <button
            className={activeTab === "globe" ? "active" : ""}
            onClick={() => setActiveTab("globe")}
            type="button"
          >
            Globe
          </button>
          <button
            className={activeTab === "motivation" ? "active" : ""}
            onClick={() => setActiveTab("motivation")}
            type="button"
          >
            Motivation
          </button>
        </nav>
      </header>

      {activeTab === "intro" ? (
        <IntroTab dataset={dataset} onExplore={() => setActiveTab("globe")} />
      ) : activeTab === "globe" ? (
        <Suspense fallback={<GlobeLoading />}>
          <GlobeExperience dataset={dataset} />
        </Suspense>
      ) : (
        <MotivationTab />
      )}
    </main>
  );
}

type IntroTabProps = {
  dataset: ReviewsDataset;
  onExplore: () => void;
};

function IntroTab({ dataset, onExplore }: IntroTabProps) {
  return (
    <section className="intro-grid">
      <div className="hero-card">
        <p className="eyebrow">Food memories, mapped</p>
        <h2>Every review becomes a point on the world.</h2>
        <p>
          This project turns Google Maps restaurant reviews and photo metadata into a dark,
          interactive globe. Start with country-level counts, then zoom into restaurants to see
          ratings, cuisine flags, review text, and photo impact.
        </p>
        <button className="primary-action" onClick={onExplore} type="button">
          Explore the globe
        </button>
      </div>

      <div className="metrics-grid" aria-label="Review metrics">
        <MetricCard label="Restaurants" value={formatNumber(dataset.metrics.totalRestaurants)} />
        <MetricCard label="Countries" value={formatNumber(dataset.metrics.totalCountries)} />
        <MetricCard label="Photos" value={formatNumber(dataset.metrics.totalPhotos)} />
        <MetricCard label="Local Guide Level" value="6" />
        <MetricCard label="Total Contribution Views" value="4.9M" />
        <MetricCard label="All-time Photo Views" value="4.5M" />
      </div>

      <section className="showcase-grid" aria-label="Future review highlights">
        <article className="showcase-card podium-card">
          <p className="eyebrow">Coming soon</p>
          <h3>Favorites Podium</h3>
          <div className="podium-preview" aria-hidden="true">
            <span>2</span>
            <span>1</span>
            <span>3</span>
          </div>
          <p>Reserved for the restaurants I would personally put on the all-time podium.</p>
        </article>

        <article className="showcase-card photo-favorite-card">
          <p className="eyebrow">Coming soon</p>
          <h3>Favorite Pic</h3>
          <div className="photo-preview" aria-hidden="true" />
          <p>A future spotlight for my favorite Google Maps photo and the story behind it.</p>
        </article>

        <article className="showcase-card">
          <p className="eyebrow">Coming soon</p>
          <h3>Review Milestones</h3>
          <p>
            Space for milestones like highest-viewed photo, most memorable meal, and favorite
            country for food.
          </p>
        </article>
      </section>
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <article className="metric-card">
      <p>{label}</p>
      <strong>{value}</strong>
    </article>
  );
}

function MotivationTab() {
  return <section className="motivation-panel" aria-label="Motivation" />;
}

function GlobeLoading() {
  return (
    <section className="globe-loading" aria-label="Loading globe">
      <div className="loading-orb" />
      <p className="eyebrow">Loading globe module</p>
      <h2>Preparing borders and starfield...</h2>
    </section>
  );
}

export default App;
