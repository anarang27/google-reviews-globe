import { useEffect, useMemo, useRef, useState } from "react";
import { Globe, Marker, Root, type RootRef } from "react-three-globe";
import { sampleReviews } from "./data/sampleReviews";
import type { CountrySummary, RestaurantReview, ReviewsDataset } from "./types";

type ActiveTab = "intro" | "reviews";
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

  const featuredReview = useMemo(
    () =>
      [...dataset.reviews].sort((a, b) => b.totalPhotoViews - a.totalPhotoViews)[0] ??
      dataset.reviews[0],
    [dataset.reviews],
  );

  function focusCountry(country: CountrySummary) {
    setSelectedCountry(country);
    setSelectedReview(null);
    setHoveredReview(null);
    globeRef.current?.pointOfView(country.coordinates);
  }

  function resetGlobe() {
    setSelectedCountry(null);
    setSelectedReview(null);
    setHoveredReview(null);
  }

  return (
    <main className="app-shell">
      <header className="site-header">
        <div>
          <p className="eyebrow">Google Maps Local Guide Archive</p>
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
            className={activeTab === "reviews" ? "active" : ""}
            onClick={() => setActiveTab("reviews")}
            type="button"
          >
            Reviews
          </button>
        </nav>
      </header>

      {activeTab === "intro" ? (
        <IntroTab dataset={dataset} featuredReview={featuredReview} onExplore={() => setActiveTab("reviews")} />
      ) : (
        <ReviewsTab
          dataMode={dataMode}
          dataset={dataset}
          globeRef={globeRef}
          selectedCountry={selectedCountry}
          visibleReviews={visibleReviews}
          hoveredReview={hoveredReview}
          selectedReview={selectedReview}
          onCountrySelect={focusCountry}
          onReset={resetGlobe}
          onReviewHover={setHoveredReview}
          onReviewSelect={setSelectedReview}
          onCloseReview={() => setSelectedReview(null)}
        />
      )}
    </main>
  );
}

type IntroTabProps = {
  dataset: ReviewsDataset;
  featuredReview: RestaurantReview;
  onExplore: () => void;
};

function IntroTab({ dataset, featuredReview, onExplore }: IntroTabProps) {
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
        <MetricCard label="Photo views" value={formatNumber(dataset.metrics.totalPhotoViews)} />
        <MetricCard label="Average rating" value={`${dataset.metrics.averageRating.toFixed(2)} / 5`} />
        <MetricCard label="Top country" value={dataset.metrics.topCountry} />
      </div>

      <article className="featured-card">
        <p className="eyebrow">Featured review</p>
        <div className="featured-title">
          <span>{featuredReview.cuisineFlag}</span>
          <h3>{featuredReview.name}</h3>
        </div>
        <p>{featuredReview.reviewText}</p>
        <dl>
          <div>
            <dt>Cuisine</dt>
            <dd>{featuredReview.cuisine}</dd>
          </div>
          <div>
            <dt>Photo views</dt>
            <dd>{formatNumber(featuredReview.totalPhotoViews)}</dd>
          </div>
          <div>
            <dt>Rating</dt>
            <dd>{featuredReview.rating}/5</dd>
          </div>
        </dl>
      </article>
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

type ReviewsTabProps = {
  dataMode: DataMode;
  dataset: ReviewsDataset;
  globeRef: React.RefObject<RootRef>;
  selectedCountry: CountrySummary | null;
  visibleReviews: RestaurantReview[];
  hoveredReview: RestaurantReview | null;
  selectedReview: RestaurantReview | null;
  onCountrySelect: (country: CountrySummary) => void;
  onReset: () => void;
  onReviewHover: (review: RestaurantReview | null) => void;
  onReviewSelect: (review: RestaurantReview) => void;
  onCloseReview: () => void;
};

function ReviewsTab({
  dataMode,
  dataset,
  globeRef,
  selectedCountry,
  visibleReviews,
  hoveredReview,
  selectedReview,
  onCountrySelect,
  onReset,
  onReviewHover,
  onReviewSelect,
  onCloseReview,
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
            <Globe texture="/earth-dark.svg" />

            {!selectedCountry &&
              dataset.countries.map((country) => (
                <Marker key={country.countryCode} coordinates={country.coordinates}>
                  <button className="country-marker" onClick={() => onCountrySelect(country)} type="button">
                    <span>{country.countryFlag}</span>
                    <strong>{country.reviewCount}</strong>
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
                    <span>{review.cuisineFlag}</span>
                  </button>
                </Marker>
              ))}
          </Root>

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
      <p className="detail-address">{review.address}</p>
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
          {visiblePhotos.map((photo) => (
            <article className="photo-card" key={photo.id}>
              {photo.assetPath && photo.mediaType === "image" ? (
                <img src={photo.assetPath} alt={photo.description || photo.title} loading="lazy" />
              ) : (
                <div className="photo-placeholder">{photo.mediaType === "video" ? "Video" : "Photo"}</div>
              )}
              <div>
                <strong>{photo.description || photo.title}</strong>
                <p>{formatNumber(photo.imageViews)} views</p>
              </div>
            </article>
          ))}
        </div>
      </section>
    </aside>
  );
}

export default App;
