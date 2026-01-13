// Map utilities for Google Maps operations
export const indiaCenter = { lat: 20.5937, lng: 78.9629 };

export class MapManager {
  constructor(mapRef, showToast) {
    this.mapRef = mapRef;
    this.showToast = showToast;
    this.mapInstance = null;
    this.pickupMarker = null;
    this.destinationMarker = null;
    this.driverMarker = null;
    this.directionsService = null;
    this.directionsRenderer = null;
    this.driverDirectionsRenderer = null;
  }

  initializeMap(onMapClick) {
    if (!this.mapRef.current || !window.google) return;

    this.mapInstance = new window.google.maps.Map(this.mapRef.current, {
      zoom: 5,
      center: indiaCenter,
      mapTypeId: "roadmap",
    });

    this.directionsService = new window.google.maps.DirectionsService();
    this.directionsRenderer = new window.google.maps.DirectionsRenderer({
      suppressMarkers: true,
      polylineOptions: { strokeColor: "#4285F4", strokeWeight: 5, strokeOpacity: 0.8 },
    });
    this.directionsRenderer.setMap(this.mapInstance);

    // Driver directions renderer
    this.driverDirectionsRenderer = new window.google.maps.DirectionsRenderer({
      suppressMarkers: true,
      polylineOptions: { strokeColor: "#FF6B35", strokeWeight: 4, strokeOpacity: 0.8 },
    });
    this.driverDirectionsRenderer.setMap(this.mapInstance);

    this.mapInstance.addListener("click", (e) => {
      onMapClick({ lat: e.latLng.lat(), lng: e.latLng.lng() });
    });
  }

  calculateAndDisplayRoute(origin, destination) {
    if (!this.directionsService || !this.directionsRenderer) return;

    this.directionsService.route(
      { origin, destination, travelMode: window.google.maps.TravelMode.DRIVING },
      (response, status) => {
        if (status === "OK") {
          this.directionsRenderer.setDirections(response);
          const bounds = new window.google.maps.LatLngBounds();
          bounds.extend(origin);
          bounds.extend(destination);
          this.mapInstance.fitBounds(bounds);
        } else {
          this.showToast("Failed to get directions.", "error");
        }
      }
    );
  }

  addPickupMarker(loc) {
    if (!this.mapInstance) return;
    if (this.pickupMarker) this.pickupMarker.setMap(null);

    this.pickupMarker = new window.google.maps.Marker({
      position: loc,
      map: this.mapInstance,
      label: "P",
      title: "Pickup Location",
      icon: {
        url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
        scaledSize: new window.google.maps.Size(40, 40),
      },
    });

    this.mapInstance.setCenter(loc);
    this.mapInstance.setZoom(12);

    if (this.destinationMarker) {
      this.calculateAndDisplayRoute(loc, this.destinationMarker.getPosition());
    }
  }

  addDestinationMarker(loc) {
    if (!this.mapInstance) return;
    if (this.destinationMarker) this.destinationMarker.setMap(null);

    this.destinationMarker = new window.google.maps.Marker({
      position: loc,
      map: this.mapInstance,
      label: "D",
      title: "Destination",
      icon: {
        url: "https://maps.google.com/mapfiles/ms/icons/green-dot.png",
        scaledSize: new window.google.maps.Size(40, 40),
      },
    });

    if (this.pickupMarker) {
      this.calculateAndDisplayRoute(this.pickupMarker.getPosition(), loc);
    }
  }

  addDriverMarker(loc) {
    if (!this.mapInstance) return;
    if (this.driverMarker) this.driverMarker.setMap(null);

    this.driverMarker = new window.google.maps.Marker({
      position: loc,
      map: this.mapInstance,
      title: "Driver Location",
      icon: {
        url: "https://maps.google.com/mapfiles/ms/icons/blue-dot.png",
        scaledSize: new window.google.maps.Size(40, 40),
      },
      animation: window.google.maps.Animation.BOUNCE,
    });

    // Show driver route to pickup
    if (this.pickupMarker && this.driverDirectionsRenderer) {
      this.directionsService.route(
        {
          origin: loc,
          destination: this.pickupMarker.getPosition(),
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (response, status) => {
          if (status === "OK") {
            this.driverDirectionsRenderer.setDirections(response);
          }
        }
      );
    }
  }

  getPickupPosition() {
    return this.pickupMarker ? this.pickupMarker.getPosition() : null;
  }

  getDestinationPosition() {
    return this.destinationMarker ? this.destinationMarker.getPosition() : null;
  }

  clearMarkers() {
    if (this.pickupMarker) {
      this.pickupMarker.setMap(null);
      this.pickupMarker = null;
    }
    if (this.destinationMarker) {
      this.destinationMarker.setMap(null);
      this.destinationMarker = null;
    }
    if (this.driverMarker) {
      this.driverMarker.setMap(null);
      this.driverMarker = null;
    }
    // Clear directions
    if (this.directionsRenderer) {
      this.directionsRenderer.setDirections({ routes: [] });
    }
    if (this.driverDirectionsRenderer) {
      this.driverDirectionsRenderer.setDirections({ routes: [] });
    }
  }
}

export const initializeAutocomplete = (pickupInputId, destInputId, onPickupSelected, onDestinationSelected) => {
  if (!window.google) return;

  setTimeout(() => {
    const pickupInput = document.getElementById(pickupInputId);
    if (pickupInput) {
      const pickupAutocomplete = new window.google.maps.places.Autocomplete(pickupInput, {
        types: ["establishment", "geocode"],
        componentRestrictions: { country: "in" },
      });
      pickupAutocomplete.addListener("place_changed", () => {
        const place = pickupAutocomplete.getPlace();
        if (place.geometry) {
          const loc = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          };
          onPickupSelected(place.formatted_address, loc);
        }
      });
    }

    const destInput = document.getElementById(destInputId);
    if (destInput) {
      const destAutocomplete = new window.google.maps.places.Autocomplete(destInput, {
        types: ["establishment", "geocode"],
        componentRestrictions: { country: "in" },
      });
      destAutocomplete.addListener("place_changed", () => {
        const place = destAutocomplete.getPlace();
        if (place.geometry) {
          const loc = {
            lat: place.geometry.location.lat(),
            lng: place.geometry.location.lng(),
          };
          onDestinationSelected(place.formatted_address, loc);
        }
      });
    }
  }, 100);
};
