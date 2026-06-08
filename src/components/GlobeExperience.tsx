import { useMemo, useRef, useState, type CSSProperties } from "react";
import { Marker, Root, type RootRef } from "react-three-globe";
import type { CountrySummary, RestaurantReview, ReviewPhoto, ReviewsDataset } from "../types";
import { WireframeEarth } from "./WireframeEarth";

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

function ratingStars(rating: number) {
  const roundedToHalf = Math.round(rating * 2) / 2;
  const fullStars = Math.floor(roundedToHalf);
  const hasHalfStar = roundedToHalf % 1 !== 0;
  const emptyStars = Math.max(0, 5 - fullStars - (hasHalfStar ? 1 : 0));

  return `${"★".repeat(fullStars)}${hasHalfStar ? "⯨" : ""}${"☆".repeat(emptyStars)}`;
}

type GlobeExperienceProps = {
  dataset: ReviewsDataset;
};

export default function GlobeExperience({ dataset }: GlobeExperienceProps) {
  const [selectedCountry, setSelectedCountry] = useState<CountrySummary | null>(null);
  const [hoveredCountry, setHoveredCountry] = useState<CountrySummary | null>(null);
  const [hoveredReview, setHoveredReview] = useState<RestaurantReview | null>(null);
  const [selectedReview, setSelectedReview] = useState<RestaurantReview | null>(null);
  const globeRef = useRef<RootRef>(null);

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
    <section className="reviews-layout">
      <div className="globe-panel">
        <div className="globe-status">
          <div>
            <p className="eyebrow">{selectedCountry ? "Country view" : "World view"}</p>
            <h2>{selectedCountry ? `${selectedCountry.countryFlag} ${selectedCountry.countryName}` : "Reviewed countries"}</h2>
          </div>
        </div>

        <div className="globe-stage" aria-label="Interactive restaurant review globe">
          <Root globeRef={globeRef} originX={0.48} originY={0.52} azimuthOffset={-0.4}>
            <WireframeEarth />

            {!selectedCountry &&
              dataset.countries.map((country) => (
                <Marker className="marker-shell" key={country.countryCode} coordinates={country.coordinates}>
                  <button
                    className={`country-hotspot ${
                      hoveredCountry?.countryCode === country.countryCode ? "hovered" : ""
                    }`}
                    onClick={() => focusCountry(country)}
                    onMouseEnter={() => setHoveredCountry(country)}
                    onMouseLeave={() => setHoveredCountry(null)}
                    type="button"
                    aria-label={`${country.countryName}: ${country.reviewCount} reviews`}
                  >
                    <span>{country.reviewCount}</span>
                  </button>
                </Marker>
              ))}

            {selectedCountry &&
              visibleReviews.map((review) => (
                <Marker className="marker-shell" key={review.id} coordinates={review.coordinates ?? selectedCountry.coordinates}>
                  <button
                    className="restaurant-marker"
                    style={{ "--marker-color": review.cuisineColor } as CSSProperties}
                    onClick={() => setSelectedReview(review)}
                    onMouseEnter={() => setHoveredReview(review)}
                    onMouseLeave={() => setHoveredReview(null)}
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
            <button className="secondary-action" onClick={resetGlobe} type="button">
              Back to world view
            </button>
          ) : (
            <p>Click a country count to zoom into its restaurants.</p>
          )}
        </div>
      </div>

      {!selectedCountry ? (
        <WorldHud dataset={dataset} onCountrySelect={focusCountry} />
      ) : (
        <CountryHud
          country={selectedCountry}
          reviews={visibleReviews}
          selectedReview={selectedReview}
          onReviewSelect={setSelectedReview}
          onOpenWorld={resetGlobe}
        />
      )}

      <GlobeControlsPanel selectedCountry={selectedCountry} />

      {selectedCountry ? (
        <aside className="legend-panel" aria-label="Cuisine legend">
          <p className="eyebrow">Cuisine legend</p>
          <h3>Review dots</h3>
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
      ) : null}

      {selectedReview ? <ReviewDetail review={selectedReview} onClose={() => setSelectedReview(null)} /> : null}
    </section>
  );
}

function GlobeControlsPanel({ selectedCountry }: { selectedCountry: CountrySummary | null }) {
  return (
    <aside className="controls-panel" aria-label="Globe controls">
      <p className="eyebrow">Controls</p>
      <ul>
        <li>Drag to rotate</li>
        <li>Scroll to zoom</li>
        <li>{selectedCountry ? "Click a restaurant dot for the full review" : "Hover a country hotspot for counts"}</li>
      </ul>
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
  const [query, setQuery] = useState("");
  const filteredReviews = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return reviews;
    }

    return reviews.filter((review) =>
      [review.name, review.cuisine, review.city]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedQuery)),
    );
  }, [query, reviews]);

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

      <label className="review-search">
        <span>Filter reviews</span>
        <input
          onChange={(event) => setQuery(event.target.value)}
          placeholder="name, city, cuisine..."
          type="search"
          value={query}
        />
      </label>

      <div className="review-list">
        {filteredReviews.length ? (
          filteredReviews.map((review) => (
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
          <p className="empty-state">
            {reviews.length ? "No restaurants match that filter." : "No restaurant reviews found for this country yet."}
          </p>
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
  const [activePhoto, setActivePhoto] = useState<ReviewPhoto | null>(null);

  return (
    <>
      <aside className="detail-panel" aria-label={`Review details for ${review.name}`}>
        <button className="close-button" onClick={onClose} type="button" aria-label="Close review details">
          ×
        </button>
        <p className="eyebrow">Full review</p>
        <div className="detail-heading">
          <span>{review.cuisineFlag}</span>
          <div>
            <h2>{review.name}</h2>
            <p className="rating-line">
              <span aria-label={`${review.rating} out of 5 stars`}>{ratingStars(review.rating)}</span>
              <span>{formatDate(review.reviewDate)}</span>
            </p>
          </div>
        </div>
        <p className="review-copy">{review.reviewText}</p>

        <section className="photo-section">
          <div>
            <p className="eyebrow">Photos</p>
            <h3>{formatNumber(review.totalPhotoViews)} total views</h3>
          </div>
          <div className="photo-grid">
            {visiblePhotos.length ? (
              visiblePhotos.map((photo) => (
                <PhotoCard key={photo.id} onOpen={setActivePhoto} photo={photo} />
              ))
            ) : (
              <p className="empty-state">No public photo assets are available for this review.</p>
            )}
          </div>
        </section>

        <a className="maps-link" href={review.googleMapsUrl} target="_blank" rel="noreferrer">
          Open on Google Maps
        </a>
      </aside>

      {activePhoto ? <PhotoLightbox onClose={() => setActivePhoto(null)} photo={activePhoto} /> : null}
    </>
  );
}

function PhotoCard({
  photo,
  onOpen,
}: {
  photo: ReviewPhoto;
  onOpen: (photo: ReviewPhoto) => void;
}) {
  return (
    <article className="photo-card">
      {photo.assetPath && photo.mediaType === "image" ? (
        <button className="photo-open" onClick={() => onOpen(photo)} type="button">
          <img src={photo.assetPath} alt={photo.description || photo.title} loading="lazy" />
        </button>
      ) : (
        <div className="photo-placeholder">{photo.mediaType === "video" ? "Video" : "Photo"}</div>
      )}
      {(photo.description.trim() || photo.imageViews > 0) ? (
        <div className="photo-meta">
          {photo.description.trim() ? <strong>{photo.description}</strong> : null}
          {photo.imageViews > 0 ? <span>{formatNumber(photo.imageViews)} views</span> : null}
        </div>
      ) : null}
    </article>
  );
}

function PhotoLightbox({ photo, onClose }: { photo: ReviewPhoto; onClose: () => void }) {
  if (!photo.assetPath || photo.mediaType !== "image") {
    return null;
  }

  return (
    <div className="photo-lightbox" role="dialog" aria-modal="true" aria-label={photo.description || photo.title}>
      <button className="photo-lightbox-backdrop" onClick={onClose} type="button" aria-label="Close photo" />
      <figure>
        <button className="close-button" onClick={onClose} type="button" aria-label="Close photo">
          ×
        </button>
        <img src={photo.assetPath} alt={photo.description || photo.title} />
        {(photo.description.trim() || photo.imageViews > 0) ? (
          <figcaption>
            {photo.description.trim() ? <strong>{photo.description}</strong> : null}
            {photo.imageViews > 0 ? <span>{formatNumber(photo.imageViews)} views</span> : null}
          </figcaption>
        ) : null}
      </figure>
    </div>
  );
}
