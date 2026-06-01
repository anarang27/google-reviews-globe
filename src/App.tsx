import { useEffect, useMemo, useRef, useState } from "react";
import { Marker, Root, type RootRef } from "react-three-globe";
import { WireframeEarth } from "./components/WireframeEarth";
import { sampleReviews } from "./data/sampleReviews";
import type { CountrySummary, RestaurantReview, ReviewsDataset } from "./types";

type ActiveTab = "intro" | "globe" | "motivation";
type DataMode = "sample" | "generated";

const numberFormatter = new Intl.NumberFormat("en-US");
const dateFormatter = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

function formatNumber(value: number) {
  return numberFormatter.format(value);
}

function formatDate(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : dateFormatter.format(parsed);
}

function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("intro");
  const [dataset, setDataset] = useState<ReviewsDataset>(sampleReviews);
  const [dataMode, setDataMode] = useState<DataMode>("sample");
  const [selectedCountry, setSelectedCountry] = useState<CountrySummary | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<CountrySummary | null>(null);
  const [hoveredReview, setHoveredReview] = useState<RestaurantReview | null>(null);
  const [selectedReview, setSelectedReview] = useState<RestaurantReview | null>(null);
  const globeRef = useRef<RootRef>(null);

  useEffect(() => {
    let cancelled = false;

    fetch("/generated/reviews.json")
      .then((response) => (response.ok ? response.json() : null))
      .then((generatedDataset: ReviewsDataset | null) => {
        if (!cancelled && generatedDataset?.reviews?.length) {
          setDataset(generatedDataset);
          setDataMode("generated");
        }
      })
      .catch(() => {
        setDataMode("sample");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const visibleReviews = useMemo(() => {
    if (!selectedCountry) {
      return [];
    }

    return dataset.reviews.filter((review) => review.countryCode === selectedCountry.countryCode);
  }, [dataset.reviews, selectedCountry]);

  function focusCountry(country: CountrySummary) {
    setSelectedCountry(country);
    setSelectedReview(null);
    setHoveredReview(null);
    globeRef.current?.pointOfView(country.coordinates);
  }

  function resetGlobe() {
    setSelectedCountry(null);
    setHoveredCountry(null);
    setSelectedReview(null);
    setHoveredReview(null);
  }

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
        <ReviewsTab
          dataMode={dataMode}
          dataset={dataset}
          globeRef={globeRef}
          selectedCountry={selectedCountry}
          hoveredCountry={hoveredCountry}
          visibleReviews={visibleReviews}
          hoveredReview={hoveredReview}
          selectedReview={selectedReview}
          onCountrySelect={focusCountry}
          onCountryHover={setHoveredCountry}
          onReset={resetGlobe}
          onReviewHover={setHoveredReview}
          onReviewSelect={setSelectedReview}
          onCloseReview={() => setSelectedReview(null)}
          onOpenWorld={resetGlobe}
        />
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

type ReviewsTabProps = {
  dataMode: DataMode;
  dataset: ReviewsDataset;
  globeRef: React.RefObject<RootRef>;
  selectedCountry: CountrySummary | null;
  hoveredCountry: CountrySummary | null;
  visibleReviews: RestaurantReview[];
  hoveredReview: RestaurantReview | null;
  selectedReview: RestaurantReview | null;
  onCountrySelect: (country: CountrySummary) => void;
  onCountryHover: (country: CountrySummary | null) => void;
  onReset: () => void;
  onReviewHover: (review: RestaurantReview | null) => void;
  onReviewSelect: (review: RestaurantReview) => void;
  onCloseReview: () => void;
  onOpenWorld: () => void;
};

function ReviewsTab({
  dataMode,
  dataset,
  globeRef,
  selectedCountry,
  hoveredCountry,
  visibleReviews,
  hoveredReview,
  selectedReview,
  onCountrySelect,
  onCountryHover,
  onReset,
  onReviewHover,
  onReviewSelect,
  onCloseReview,
  onOpenWorld,
}: ReviewsTabProps) {
  return (
    <section className="reviews-layout">
      <div className="globe-panel">
        <div className="globe-status">
          <div>
            <p className="eyebrow">{selectedCountry ? "Country view" : "World view"}</p>
            <h2>{selectedCountry ? `${selectedCountry.countryFlag} ${selectedCountry.countryName}` : "Reviewed countries"}</h2>
          </div>
          <span className="data-badge">{dataMode === "generated" ? "Local full dataset" : "Sample dataset"}</span>
        </div>

        <div className="globe-stage" aria-label="Interactive restaurant review globe">
          <Root globeRef={globeRef} originX={0.48} originY={0.52} azimuthOffset={-0.4}>
            <WireframeEarth />

            {!selectedCountry &&
              dataset.countries.map((country) => (
                <Marker key={country.countryCode} coordinates={country.coordinates}>
                  <button
                    className={`country-hotspot ${
                      hoveredCountry?.countryCode === country.countryCode ? "hovered" : ""
                    }`}
                    onClick={() => onCountrySelect(country)}
                    onMouseEnter={() => onCountryHover(country)}
                    onMouseLeave={() => onCountryHover(null)}
                    type="button"
                    aria-label={`${country.countryName}: ${country.reviewCount} reviews`}
                  >
                    <span>{country.reviewCount}</span>
                  </button>
                </Marker>
              ))}

            {selectedCountry &&
              visibleReviews.map((review) => (
                <Marker key={review.id} coordinates={review.coordinates ?? selectedCountry.coordinates}>
                  <button
                    className="restaurant-marker"
                    style={{ "--marker-color": review.cuisineColor } as React.CSSProperties}
                    onClick={() => onReviewSelect(review)}
                    onMouseEnter={() => onReviewHover(review)}
                    onMouseLeave={() => onReviewHover(null)}
                    type="button"
                    aria-label={`Open review for ${review.name}`}
                  >
                    <span />
                  </button>
                </Marker>
              ))}
          </Root>

          {hoveredCountry && !selectedCountry ? <CountryHoverCard country={hoveredCountry} /> : null}
          {hoveredReview && !selectedReview ? <HoverCard review={hoveredReview} /> : null}
        </div>

        <div className="globe-actions">
          {selectedCountry ? (
            <button className="secondary-action" onClick={onReset} type="button">
              Back to world view
            </button>
          ) : (
            <p>Click a country count to zoom into its restaurants.</p>
          )}
        </div>
      </div>

      {!selectedCountry ? (
        <WorldHud dataset={dataset} onCountrySelect={onCountrySelect} />
      ) : (
        <CountryHud
          country={selectedCountry}
          reviews={visibleReviews}
          selectedReview={selectedReview}
          onReviewSelect={onReviewSelect}
          onOpenWorld={onOpenWorld}
        />
      )}

      <GlobeControlsPanel selectedCountry={selectedCountry} dataMode={dataMode} />

      <aside className="legend-panel" aria-label="Cuisine legend">
        <p className="eyebrow">Cuisine legend</p>
        <h3>Flags show cuisine origin</h3>
        <div className="legend-list">
          {dataset.cuisines.map((cuisine) => (
            <div className="legend-item" key={cuisine.cuisine}>
              <span className="legend-dot" style={{ background: cuisine.cuisineColor }} />
              <span>{cuisine.cuisineFlag}</span>
              <strong>{cuisine.cuisine}</strong>
              <em>{cuisine.count}</em>
            </div>
          ))}
        </div>
      </aside>

      {selectedReview ? <ReviewDetail review={selectedReview} onClose={onCloseReview} /> : null}
    </section>
  );
}

function GlobeControlsPanel({
  selectedCountry,
  dataMode,
}: {
  selectedCountry: CountrySummary | null;
  dataMode: DataMode;
}) {
  return (
    <aside className="controls-panel" aria-label="Globe controls">
      <p className="eyebrow">Controls</p>
      <ul>
        <li>Drag to rotate</li>
        <li>Scroll to zoom</li>
        <li>{selectedCountry ? "Click a restaurant dot for the full review" : "Hover a country hotspot for counts"}</li>
      </ul>
      <span>{dataMode === "generated" ? "Using local full dataset" : "Using public sample data"}</span>
    </aside>
  );
}

function WorldHud({
  dataset,
  onCountrySelect,
}: {
  dataset: ReviewsDataset;
  onCountrySelect: (country: CountrySummary) => void;
}) {
  return (
    <aside className="hud-panel world-hud" aria-label="World overview">
      <p className="eyebrow">Mission select</p>
      <h3>Pick a country</h3>
      <div className="hud-stats">
        <span>{formatNumber(dataset.metrics.totalRestaurants)} restaurants</span>
        <span>{formatNumber(dataset.metrics.totalCountries)} countries</span>
        <span>{formatNumber(dataset.metrics.totalPhotos)} photos</span>
      </div>
      <div className="country-list">
        {dataset.countries.map((country) => (
          <button key={country.countryCode} onClick={() => onCountrySelect(country)} type="button">
            <span>{country.countryName}</span>
            <strong>{country.reviewCount}</strong>
          </button>
        ))}
      </div>
    </aside>
  );
}

function CountryHud({
  country,
  reviews,
  selectedReview,
  onReviewSelect,
  onOpenWorld,
}: {
  country: CountrySummary;
  reviews: RestaurantReview[];
  selectedReview: RestaurantReview | null;
  onReviewSelect: (review: RestaurantReview) => void;
  onOpenWorld: () => void;
}) {
  return (
    <aside className="hud-panel country-hud" aria-label={`${country.countryName} reviews`}>
      <div className="hud-heading">
        <div>
          <p className="eyebrow">Country unlocked</p>
          <h3>{country.countryName}</h3>
        </div>
        <button onClick={onOpenWorld} type="button">
          World
        </button>
      </div>

      <div className="hud-stats">
        <span>{formatNumber(country.reviewCount)} reviews</span>
        <span>{formatNumber(country.photoCount)} photos</span>
        <span>{formatNumber(country.totalPhotoViews)} views</span>
      </div>

      <div className="review-list">
        {reviews.length ? (
          reviews.map((review) => (
            <button
              className={selectedReview?.id === review.id ? "active" : ""}
              key={review.id}
              onClick={() => onReviewSelect(review)}
              type="button"
            >
              <span className="review-list-dot" style={{ background: review.cuisineColor }} />
              <span>
                <strong>{review.name}</strong>
                <em>
                  {review.cuisine} · {review.rating}/5 · {formatNumber(review.totalPhotoViews)} views
                </em>
              </span>
            </button>
          ))
        ) : (
          <p className="empty-state">No restaurant reviews found for this country yet.</p>
        )}
      </div>
    </aside>
  );
}

function CountryHoverCard({ country }: { country: CountrySummary }) {
  return (
    <article className="hover-card country-card">
      <div>
        <h3>{country.countryName}</h3>
        <p>
          {formatNumber(country.reviewCount)} {country.reviewCount === 1 ? "review" : "reviews"}
        </p>
        <strong>{formatNumber(country.totalPhotoViews)} photo views</strong>
      </div>
    </article>
  );
}

function HoverCard({ review }: { review: RestaurantReview }) {
  return (
    <article className="hover-card">
      <span className="flag-pill">{review.cuisineFlag}</span>
      <div>
        <h3>{review.name}</h3>
        <p>
          {review.rating}/5 · {review.cuisine} · {formatDate(review.reviewDate)}
        </p>
        <p>{review.city || review.countryName}</p>
        <strong>{formatNumber(review.totalPhotoViews)} photo views</strong>
      </div>
    </article>
  );
}

function ReviewDetail({ review, onClose }: { review: RestaurantReview; onClose: () => void }) {
  const visiblePhotos = review.photos.slice(0, 6);

  return (
    <aside className="detail-panel" aria-label={`Review details for ${review.name}`}>
      <button className="close-button" onClick={onClose} type="button" aria-label="Close review details">
        ×
      </button>
      <p className="eyebrow">Full review</p>
      <div className="detail-heading">
        <span>{review.cuisineFlag}</span>
        <div>
          <h2>{review.name}</h2>
          <p>
            {review.cuisine} · {review.rating}/5 · {formatDate(review.reviewDate)}
          </p>
        </div>
      </div>
      <p className="review-copy">{review.reviewText}</p>
      <a className="maps-link" href={review.googleMapsUrl} target="_blank" rel="noreferrer">
        Open on Google Maps
      </a>

      <section className="photo-section">
        <div>
          <p className="eyebrow">Photos</p>
          <h3>{formatNumber(review.totalPhotoViews)} total views</h3>
        </div>
        <div className="photo-grid">
          {visiblePhotos.length ? (
            visiblePhotos.map((photo) => (
              <article className="photo-card" key={photo.id}>
                {photo.assetPath && photo.mediaType === "image" ? (
                  <img src={photo.assetPath} alt={photo.description || photo.title} loading="lazy" />
                ) : (
                  <div className="photo-placeholder">{photo.mediaType === "video" ? "Video" : "Photo"}</div>
                )}
              </article>
            ))
          ) : (
            <p className="empty-state">No public photo assets are available for this review.</p>
          )}
        </div>
      </section>
    </aside>
  );
}

export default App;
