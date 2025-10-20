// frontend/src/Components/NearbyGyms.jsx
import React, { useEffect, useState, useRef } from "react";

const NearbyGyms = () => {
  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(false);
  const [gmapsLoaded, setGmapsLoaded] = useState(false);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [radius, setRadius] = useState(1500);

  const mapRef = useRef(null); // invisible map container
  const scriptRef = useRef(null); // script element reference

  // 1) Load Google Maps JS + Places library (only once)
  useEffect(() => {
    if (window.google && window.google.maps && window.google.maps.places) {
      setGmapsLoaded(true);
      return;
    }

    // Prevent loading twice
    if (scriptRef.current) return;

    const key = import.meta.env.VITE_MAPS_API_KEY;
    if (!key) {
      setError("Missing Maps API key. Add VITE_MAPS_API_KEY to your .env.");
      return;
    }

    const script = document.createElement("script");
    scriptRef.current = script;
    script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      setGmapsLoaded(true);
      // create a hidden div for the Map/PlacesService to attach to
      if (!mapRef.current) {
        const hidden = document.createElement("div");
        hidden.style.display = "none";
        hidden.id = "gmaps-hidden-map";
        document.body.appendChild(hidden);
        mapRef.current = hidden;
      }
    };
    script.onerror = () => {
      setError("Failed to load Google Maps script.");
    };

    document.head.appendChild(script);

    // cleanup if component unmounts
    return () => {
      // don't remove script element if other components may use it
    };
  }, []);

  // 2) get user location and run initial search
  useEffect(() => {
    if (!("geolocation" in navigator)) {
      setError("Geolocation not supported by your browser.");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ latitude, longitude });
        // wait until gmaps loaded
        if (window.google && window.google.maps && window.google.maps.places) {
          searchNearby(latitude, longitude, radius);
        } else {
          // try after load
          const interval = setInterval(() => {
            if (window.google && window.google.maps && window.google.maps.places) {
              clearInterval(interval);
              searchNearby(latitude, longitude, radius);
            }
          }, 300);
        }
      },
      (err) => {
        console.error("Geolocation error:", err);
        // fallback location (update as you like)
        const defaultLoc = { latitude: 18.399251, longitude: 76.556786 };
        setUserLocation(defaultLoc);
        // still try searching using default once maps ready
        const interval = setInterval(() => {
          if (window.google && window.google.maps && window.google.maps.places) {
            clearInterval(interval);
            searchNearby(defaultLoc.latitude, defaultLoc.longitude, radius);
          }
        }, 300);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [radius]);

  // actual Places search using Google Maps JS SDK
  const searchNearby = (lat, lng, radiusMeters = 1500) => {
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      setError("Google Maps library not loaded.");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // create an invisible map element for PlacesService (required)
    let mapElement = mapRef.current;
    if (!mapElement) {
      mapElement = document.createElement("div");
      mapElement.style.display = "none";
      document.body.appendChild(mapElement);
      mapRef.current = mapElement;
    }

    // create a Map object and PlacesService
    const map = new window.google.maps.Map(mapElement);
    const service = new window.google.maps.places.PlacesService(map);

    const location = new window.google.maps.LatLng(lat, lng);
    const request = {
      location,
      radius: radiusMeters,
      type: "gym", // specific place type
      keyword: "gym", // additional filter
    };

    service.nearbySearch(request, (results, status, pagination) => {
      setLoading(false);
      if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
        setGyms(results);
      } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
        setGyms([]);
        setError("No gyms found nearby.");
      } else {
        console.error("PlacesService error:", status);
        setGyms([]);
        setError("PlacesService error: " + status);
      }
    });
  };

  const handleRadiusChange = (e) => {
    const val = Number(e.target.value);
    setRadius(val);
    if (userLocation) searchNearby(userLocation.latitude, userLocation.longitude, val);
  };

  const getDirectionsUrl = (place) => {
    // Use geometry.location if present
    const lat = place.geometry?.location?.lat?.() ?? place.geometry?.location?.lat;
    const lng = place.geometry?.location?.lng?.() ?? place.geometry?.location?.lng;
    if (!lat || !lng) return "#";
    return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
  };

  return (
    <div className="container px-4 py-8 mx-auto">
      <div className="mb-8 text-center">
        <h2 className="mb-4 text-3xl font-bold text-gray-800">Find Nearby Gyms</h2>
        <p className="mx-auto max-w-2xl text-gray-600">
          Discover fitness centers in your area — we use Google Places to find them.
        </p>
      </div>

      <div className="mb-6 flex gap-4 items-center">
        <label>
          Radius (meters):
          <select value={radius} onChange={handleRadiusChange} className="ml-2 p-1 border rounded">
            <option value={500}>500</option>
            <option value={1000}>1000</option>
            <option value={1500}>1500</option>
            <option value={3000}>3000</option>
          </select>
        </label>
        {loading && <span>Searching…</span>}
      </div>

      {error && (
        <div className="mb-4 text-red-600">
          {error}
        </div>
      )}

      <div>
        {gyms.length === 0 && !loading ? (
          <div>No gyms to show.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {gyms.map((g) => (
              <div key={g.place_id} className="p-4 border rounded shadow-sm">
                <div className="font-semibold text-lg">{g.name}</div>
                <div className="text-sm text-gray-600">{g.vicinity || g.formatted_address}</div>
                <div className="mt-2 flex gap-2">
                  <a
                    href={g.url || getDirectionsUrl(g)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 border rounded"
                  >
                    View
                  </a>
                  <a
                    href={getDirectionsUrl(g)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1 border rounded"
                  >
                    Directions
                  </a>
                </div>
                <div className="mt-2 text-xs text-gray-500">
                  Rating: {g.rating ?? "N/A"} — {g.user_ratings_total ?? 0} reviews
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default NearbyGyms;
