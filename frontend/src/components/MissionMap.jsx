import { useEffect, useRef, useState } from 'react'
import * as maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { API_BASE_URL } from '../config'

function MissionMap({ mission, onLocationSaved, onNotify }) {
  const mapContainer = useRef(null)
  const mapInstance = useRef(null)

  const savedMarkerInstance = useRef(null)
  const proposedMarkerInstance = useRef(null)

  const [selectedCoordinates, setSelectedCoordinates] = useState(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (!mapContainer.current || mapInstance.current) return

    const map = new maplibregl.Map({
      container: mapContainer.current,
      style: {
        version: 8,
        sources: {
          terrain: {
            type: 'raster',
            tiles: [
              'https://a.tile.opentopomap.org/{z}/{x}/{y}.png',
              'https://b.tile.opentopomap.org/{z}/{x}/{y}.png',
              'https://c.tile.opentopomap.org/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            attribution:
              'Map data © OpenStreetMap contributors, SRTM | Map style © OpenTopoMap (CC-BY-SA)',
          },
        },
        layers: [
          {
            id: 'terrain-layer',
            type: 'raster',
            source: 'terrain',
          },
        ],
      },
      center: [-120.17, 39.32],
      zoom: 10,
    })

    map.addControl(new maplibregl.NavigationControl(), 'top-right')

    map.on('click', (event) => {
      const latitude = Number(event.lngLat.lat.toFixed(6))
      const longitude = Number(event.lngLat.lng.toFixed(6))

      setSelectedCoordinates({
        latitude,
        longitude,
      })

      // Move or create the orange proposed-location marker
      if (proposedMarkerInstance.current) {
        proposedMarkerInstance.current.setLngLat([longitude, latitude])
      } else {
        proposedMarkerInstance.current = new maplibregl.Marker({
          color: '#f97316',
        })
          .setLngLat([longitude, latitude])
          .addTo(map)
      }
    })

    mapInstance.current = map

    return () => {
      savedMarkerInstance.current?.remove()
      proposedMarkerInstance.current?.remove()

      savedMarkerInstance.current = null
      proposedMarkerInstance.current = null

      map.remove()
      mapInstance.current = null
    }
  }, [])
  // Display the saved location of the selected mission

  useEffect(() => {
    const map = mapInstance.current

    if (!map) return

    const latitude = mission?.latitude
    const longitude = mission?.longitude

    // Remove markers from the previously selected mission
    savedMarkerInstance.current?.remove()
    proposedMarkerInstance.current?.remove()

    savedMarkerInstance.current = null
    proposedMarkerInstance.current = null

    setSelectedCoordinates(null)

    // Don't show a saved marker without valid coordinates
    if (
      latitude == null ||
      longitude == null ||
      !Number.isFinite(latitude) ||
      !Number.isFinite(longitude)
    ) {
      return
    }

    // Green marker represents the saved mission location
    savedMarkerInstance.current = new maplibregl.Marker({
      color: '#22c55e',
    })
      .setLngLat([longitude, latitude])
      .addTo(map)

    map.flyTo({
      center: [longitude, latitude],
      zoom: 12,
      essential: true,
    })
  }, [mission?.id, mission?.latitude, mission?.longitude])

  const saveMissionLocation = async () => {
    if (!mission?.id || !selectedCoordinates || isSaving) return

    const confirmed = window.confirm(
      `Save this location for "${mission.name}"?\n\n` +
        `Latitude: ${selectedCoordinates.latitude}\n` +
        `Longitude: ${selectedCoordinates.longitude}`,
    )

    if (!confirmed) return
    setIsSaving(true)

    try {
      const response = await fetch(
        `${API_BASE_URL}/missions/${mission.id}/location`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(selectedCoordinates),
        },
      )

      if (!response.ok) {
        throw new Error('Failed to save mission location')
      }

      const data = await response.json()

      // Update the saved mission in React
      onLocationSaved?.(data.mission)

      // Remove the orange proposed marker
      proposedMarkerInstance.current?.remove()
      proposedMarkerInstance.current = null

      // Clear the proposed coordinates
      setSelectedCoordinates(null)

      onNotify?.({
        type: 'success',
        message: 'Mission location saved successfully!',
      })
    } catch (error) {
      console.error(error)
      onNotify?.({
        type: 'error',
        message: 'Unable to save mission location.',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="mission-map-panel">
      <div className="mission-map-header">
        <div>
          <span className="panel-eyebrow">GEOSPATIAL OPERATIONS</span>
          <h2>{mission ? mission.name : 'Mission Map'}</h2>
          <p className="mission-map-location">
            {mission
              ? `Reported location: ${mission.location || 'Not specified'}`
              : 'Select a mission to view its details'}
          </p>
        </div>

        <span className="mission-map-label">
          {mission
            ? mission.ended_at
              ? 'Completed Mission'
              : mission.started_at
                ? 'Active Mission'
                : 'Not Started'
            : 'Topographic'}
        </span>
      </div>

      <div ref={mapContainer} className="mission-map-container" />
      {selectedCoordinates && (
        <p className="mission-map-location">
          Selected coordinates: {selectedCoordinates.latitude},{' '}
          {selectedCoordinates.longitude}
        </p>
      )}

      {mission && selectedCoordinates && (
        <div className="mission-map-actions">
          <button
            type="button"
            onClick={saveMissionLocation}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Mission Location'}
          </button>

          <button
            type="button"
            onClick={() => {
              proposedMarkerInstance.current?.remove()
              proposedMarkerInstance.current = null
              setSelectedCoordinates(null)
            }}
          >
            Cancel Selection
          </button>
        </div>
      )}
    </section>
  )
}

export default MissionMap
