export type Coordinates = {
  lat: number;
  lng: number;
};

export type ReviewPhoto = {
  id: string;
  title: string;
  description: string;
  imageViews: number;
  assetPath: string | null;
  mediaType: "image" | "video" | "unknown";
  coordinates: Coordinates | null;
  creationTime: string | null;
  photoTakenTime: string | null;
};

export type RestaurantReview = {
  id: string;
  name: string;
  address: string;
  countryCode: string;
  countryName: string;
  countryFlag: string;
  city: string;
  coordinates: Coordinates | null;
  rating: number;
  reviewDate: string;
  googleMapsUrl: string;
  reviewText: string;
  category: "Restaurant";
  cuisine: string;
  cuisineFlag: string;
  cuisineColor: string;
  photos: ReviewPhoto[];
  totalPhotoViews: number;
};

export type CountrySummary = {
  countryCode: string;
  countryName: string;
  countryFlag: string;
  coordinates: Coordinates;
  reviewCount: number;
  photoCount: number;
  totalPhotoViews: number;
};

export type CuisineSummary = {
  cuisine: string;
  cuisineFlag: string;
  cuisineColor: string;
  count: number;
};

export type AppMetrics = {
  totalRestaurants: number;
  totalCountries: number;
  totalPhotos: number;
  totalPhotoViews: number;
  averageRating: number;
  topCountry: string;
};

export type ReviewsDataset = {
  generatedAt: string;
  metrics: AppMetrics;
  countries: CountrySummary[];
  cuisines: CuisineSummary[];
  reviews: RestaurantReview[];
};
