import { copyFile, mkdir, readdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const sourceDir = path.join(rootDir, "organized_restaurants");
const publicAssetsDir = path.join(rootDir, "public", "review-assets");
const outputPath = path.join(rootDir, "public", "generated", "reviews.json");
const cuisineMapPath = path.join(rootDir, "data", "cuisine-map.json");

const fallbackCuisine = {
  cuisine: "Other",
  cuisineFlag: "🏳️",
  cuisineColor: "#b8c1ec",
};

const countryLookups = [
  { match: "United States", countryCode: "US", countryName: "United States", countryFlag: "🇺🇸", coordinates: { lat: 39.5, lng: -98.35 } },
  { match: "Spain", countryCode: "ES", countryName: "Spain", countryFlag: "🇪🇸", coordinates: { lat: 40.46, lng: -3.75 } },
  { match: "Indonesia", countryCode: "ID", countryName: "Indonesia", countryFlag: "🇮🇩", coordinates: { lat: -2.55, lng: 118.02 } },
  { match: "Malaysia", countryCode: "MY", countryName: "Malaysia", countryFlag: "🇲🇾", coordinates: { lat: 4.21, lng: 101.98 } },
  { match: "India", countryCode: "IN", countryName: "India", countryFlag: "🇮🇳", coordinates: { lat: 20.59, lng: 78.96 } },
  { match: "Japan", countryCode: "JP", countryName: "Japan", countryFlag: "🇯🇵", coordinates: { lat: 36.2, lng: 138.25 } },
  { match: "Vietnam", countryCode: "VN", countryName: "Vietnam", countryFlag: "🇻🇳", coordinates: { lat: 14.06, lng: 108.28 } },
  { match: "Qatar", countryCode: "QA", countryName: "Qatar", countryFlag: "🇶🇦", coordinates: { lat: 25.35, lng: 51.18 } },
  { match: "Mexico", countryCode: "MX", countryName: "Mexico", countryFlag: "🇲🇽", coordinates: { lat: 23.63, lng: -102.55 } },
];

function slugify(value) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function parseInfoFile(contents) {
  const lines = contents.split(/\r?\n/);
  const reviewStart = lines.findIndex((line) => line.trim() === "--- Review ---");
  const metadataLines = reviewStart >= 0 ? lines.slice(0, reviewStart) : lines;
  const reviewText = reviewStart >= 0 ? lines.slice(reviewStart + 1).join("\n").trim() : "";
  const metadata = new Map();

  for (const line of metadataLines) {
    const match = line.match(/^([^:]+):\s*(.*)$/);
    if (match) {
      metadata.set(match[1].trim(), match[2].trim());
    }
  }

  return {
    name: metadata.get("Location") ?? "Unknown restaurant",
    address: metadata.get("Address") ?? "",
    rating: parseRating(metadata.get("Rating") ?? ""),
    reviewDate: parseReviewDate(metadata.get("Review Date") ?? ""),
    googleMapsUrl: metadata.get("Google Maps") ?? "",
    reviewText,
  };
}

function parseRating(value) {
  const fractionMatch = value.match(/\((\d+(?:\.\d+)?)\/5\)/);
  if (fractionMatch) {
    return Number(fractionMatch[1]);
  }

  const starCount = [...value].filter((char) => char === "⭐").length;
  return starCount || 0;
}

function parseReviewDate(value) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? value : parsed.toISOString();
}

function parseImageViews(value) {
  if (typeof value === "number") {
    return value;
  }

  return Number.parseInt(String(value ?? "0").replace(/,/g, ""), 10) || 0;
}

function mediaTypeFor(title) {
  const ext = path.extname(title).toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp"].includes(ext)) {
    return "image";
  }

  if ([".mp4", ".mov", ".m4v", ".webm"].includes(ext)) {
    return "video";
  }

  return "unknown";
}

function coordinateFromGeoData(geoDataExif) {
  if (!geoDataExif) {
    return null;
  }

  const lat = Number(geoDataExif.latitude);
  const lng = Number(geoDataExif.longitude);

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || (lat === 0 && lng === 0)) {
    return null;
  }

  return { lat, lng };
}

function averageCoordinates(coordinates) {
  if (!coordinates.length) {
    return null;
  }

  const totals = coordinates.reduce(
    (acc, coordinate) => ({
      lat: acc.lat + coordinate.lat,
      lng: acc.lng + coordinate.lng,
    }),
    { lat: 0, lng: 0 },
  );

  return {
    lat: totals.lat / coordinates.length,
    lng: totals.lng / coordinates.length,
  };
}

function countryFromAddress(address) {
  const found = countryLookups.find((country) => address.includes(country.match));
  return (
    found ?? {
      countryCode: "ZZ",
      countryName: "Unknown",
      countryFlag: "🌐",
      coordinates: { lat: 0, lng: 0 },
    }
  );
}

function cityFromAddress(address) {
  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);

  return parts.length >= 3 ? parts[parts.length - 3] : parts[0] ?? "";
}

async function readCuisineMap() {
  try {
    return JSON.parse(await readFile(cuisineMapPath, "utf8"));
  } catch {
    return {};
  }
}

async function fileExists(filePath) {
  try {
    await readFile(filePath);
    return true;
  } catch {
    return false;
  }
}

async function copyMediaAsset(restaurantDir, restaurantSlug, mediaTitle) {
  const sourcePath = path.join(restaurantDir, mediaTitle);
  const exists = await fileExists(sourcePath);

  if (!exists) {
    return null;
  }

  const destinationDir = path.join(publicAssetsDir, restaurantSlug);
  const destinationPath = path.join(destinationDir, mediaTitle);
  await mkdir(destinationDir, { recursive: true });
  await copyFile(sourcePath, destinationPath);

  return `/review-assets/${restaurantSlug}/${encodeURIComponent(mediaTitle)}`;
}

async function parseRestaurant(restaurantDir, folderName, cuisineMap) {
  const restaurantSlug = slugify(folderName);
  const infoPath = path.join(restaurantDir, "review_info.txt");
  const info = parseInfoFile(await readFile(infoPath, "utf8"));
  const cuisine = cuisineMap[info.name] ?? cuisineMap[folderName] ?? fallbackCuisine;
  const entries = await readdir(restaurantDir);
  const metadataFiles = entries.filter((entry) => entry.endsWith(".json")).sort();
  const photos = [];

  for (const metadataFile of metadataFiles) {
    const metadataPath = path.join(restaurantDir, metadataFile);
    const metadata = JSON.parse(await readFile(metadataPath, "utf8"));
    const mediaTitle = metadata.title ?? metadataFile.replace(/\.json$/, "");
    const coordinates = coordinateFromGeoData(metadata.geoDataExif);
    const assetPath = await copyMediaAsset(restaurantDir, restaurantSlug, mediaTitle);

    photos.push({
      id: slugify(`${folderName}-${mediaTitle}`),
      title: mediaTitle,
      description: metadata.description ?? "",
      imageViews: parseImageViews(metadata.imageViews),
      assetPath,
      mediaType: mediaTypeFor(mediaTitle),
      coordinates,
      creationTime: metadata.creationTime?.formatted ?? null,
      photoTakenTime: metadata.photoTakenTime?.formatted ?? null,
    });
  }

  const country = countryFromAddress(info.address);
  const coordinates = averageCoordinates(photos.map((photo) => photo.coordinates).filter(Boolean));
  const totalPhotoViews = photos.reduce((total, photo) => total + photo.imageViews, 0);

  return {
    id: restaurantSlug,
    name: info.name,
    address: info.address,
    countryCode: country.countryCode,
    countryName: country.countryName,
    countryFlag: country.countryFlag,
    city: cityFromAddress(info.address),
    coordinates: coordinates ?? country.coordinates,
    rating: info.rating,
    reviewDate: info.reviewDate,
    googleMapsUrl: info.googleMapsUrl,
    reviewText: info.reviewText,
    category: "Restaurant",
    cuisine: cuisine.cuisine,
    cuisineFlag: cuisine.cuisineFlag,
    cuisineColor: cuisine.cuisineColor,
    photos,
    totalPhotoViews,
  };
}

function buildCountrySummaries(reviews) {
  const countries = new Map();

  for (const review of reviews) {
    const current = countries.get(review.countryCode) ?? {
      countryCode: review.countryCode,
      countryName: review.countryName,
      countryFlag: review.countryFlag,
      coordinates: { lat: 0, lng: 0 },
      reviewCount: 0,
      photoCount: 0,
      totalPhotoViews: 0,
      coordinateCount: 0,
    };

    current.reviewCount += 1;
    current.photoCount += review.photos.length;
    current.totalPhotoViews += review.totalPhotoViews;

    if (review.coordinates) {
      current.coordinates.lat += review.coordinates.lat;
      current.coordinates.lng += review.coordinates.lng;
      current.coordinateCount += 1;
    }

    countries.set(review.countryCode, current);
  }

  return [...countries.values()]
    .map(({ coordinateCount, ...country }) => ({
      ...country,
      coordinates: coordinateCount
        ? {
            lat: country.coordinates.lat / coordinateCount,
            lng: country.coordinates.lng / coordinateCount,
          }
        : country.coordinates,
    }))
    .sort((a, b) => b.reviewCount - a.reviewCount);
}

function buildCuisineSummaries(reviews) {
  const cuisines = new Map();

  for (const review of reviews) {
    const current = cuisines.get(review.cuisine) ?? {
      cuisine: review.cuisine,
      cuisineFlag: review.cuisineFlag,
      cuisineColor: review.cuisineColor,
      count: 0,
    };

    current.count += 1;
    cuisines.set(review.cuisine, current);
  }

  return [...cuisines.values()].sort((a, b) => b.count - a.count || a.cuisine.localeCompare(b.cuisine));
}

function buildMetrics(reviews, countries) {
  const totalPhotos = reviews.reduce((total, review) => total + review.photos.length, 0);
  const totalPhotoViews = reviews.reduce((total, review) => total + review.totalPhotoViews, 0);
  const ratingTotal = reviews.reduce((total, review) => total + review.rating, 0);

  return {
    totalRestaurants: reviews.length,
    totalCountries: countries.length,
    totalPhotos,
    totalPhotoViews,
    averageRating: reviews.length ? Number((ratingTotal / reviews.length).toFixed(2)) : 0,
    topCountry: countries[0]?.countryName ?? "N/A",
  };
}

async function main() {
  const cuisineMap = await readCuisineMap();
  await rm(publicAssetsDir, { recursive: true, force: true });
  await mkdir(publicAssetsDir, { recursive: true });

  const entries = await readdir(sourceDir, { withFileTypes: true });
  const restaurantFolders = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));

  const reviews = [];

  for (const folderName of restaurantFolders) {
    const restaurantDir = path.join(sourceDir, folderName);
    const hasReview = await fileExists(path.join(restaurantDir, "review_info.txt"));

    if (hasReview) {
      reviews.push(await parseRestaurant(restaurantDir, folderName, cuisineMap));
    }
  }

  const countries = buildCountrySummaries(reviews);
  const dataset = {
    generatedAt: new Date().toISOString(),
    metrics: buildMetrics(reviews, countries),
    countries,
    cuisines: buildCuisineSummaries(reviews),
    reviews,
  };

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(dataset, null, 2)}\n`);

  console.log(`Generated ${reviews.length} reviews into ${path.relative(rootDir, outputPath)}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
