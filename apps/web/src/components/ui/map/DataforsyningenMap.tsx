import FullscreenIcon from '@mui/icons-material/Fullscreen';
import FullscreenExitIcon from '@mui/icons-material/FullscreenExit';
import { Box, IconButton } from '@mui/material';
import { defaults as defaultControls } from 'ol/control/defaults.js';
import ScaleLine from 'ol/control/ScaleLine.js';
import { defaults as defaultInteractions } from 'ol/interaction/defaults.js';
import TileLayer from 'ol/layer/Tile.js';
import OpenLayersMap from 'ol/Map.js';
import { fromLonLat } from 'ol/proj.js';
import TileWMS from 'ol/source/TileWMS.js';
import View from 'ol/View.js';
import { useEffect, useRef, useState } from 'react';
import 'ol/ol.css';

type DataforsyningenMapProps = {
  title?: string;
};

const token = import.meta.env.VITE_DATAFORSYNINGEN_TOKEN ?? '';

export function DataforsyningenMap({
  title = 'Kort fra Dataforsyningen',
}: DataforsyningenMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapError, setMapError] = useState(false);

  useEffect(() => {
    if (!targetRef.current || !token) return;

    const source = new TileWMS({
      url: 'https://api.dataforsyningen.dk/wms/forvaltning2',
      params: {
        token,
        LAYERS: 'Basis_kort,Vejnavne_basiskort,Stednavne_basiskort',
        FORMAT: 'image/png',
        VERSION: '1.1.1',
        TRANSPARENT: false,
      },
      attributions:
        '&copy; <a href="https://www.klimadatastyrelsen.dk/" target="_blank" rel="noopener noreferrer">Klimadatastyrelsen</a>',
    });
    source.on('tileloaderror', () => setMapError(true));

    const map = new OpenLayersMap({
      target: targetRef.current,
      layers: [new TileLayer({ source })],
      interactions: defaultInteractions({ onFocusOnly: false }),
      controls: defaultControls({
        attributionOptions: { collapsible: false },
      }).extend([new ScaleLine({ units: 'metric' })]),
      view: new View({
        center: fromLonLat([10.4, 55.7]),
        zoom: 7,
        minZoom: 6,
        maxZoom: 20,
      }),
    });
    return () => map.dispose();
  }, []);

  useEffect(() => {
    const updateFullscreen = () =>
      setIsFullscreen(document.fullscreenElement === mapRef.current);

    document.addEventListener('fullscreenchange', updateFullscreen);
    return () =>
      document.removeEventListener('fullscreenchange', updateFullscreen);
  }, []);

  async function toggleFullscreen() {
    if (document.fullscreenElement === mapRef.current) {
      await document.exitFullscreen();
    } else {
      await mapRef.current?.requestFullscreen();
    }
  }

  return (
    <Box
      ref={mapRef}
      sx={{
        position: 'relative',
        width: '100%',
        height: { xs: 420, sm: 640 },
        borderRadius: 1,
        overflow: 'hidden',
        boxShadow: '0 8px 8px 0 grey',
        '&:fullscreen': { height: '100vh', borderRadius: 0 },
      }}
    >
      <Box
        aria-label={title}
        ref={targetRef}
        role="region"
        sx={{ width: '100%', height: '100%', bgcolor: '#F7F9FC' }}
        tabIndex={0}
      />
      {(!token || mapError) && (
        <Box
          role="status"
          sx={{
            position: 'absolute',
            top: 16,
            left: 56,
            right: 56,
            p: 2,
            bgcolor: 'background.paper',
            borderRadius: 1,
          }}
        >
          Kortet kunne ikke indlæses. Prøv igen senere.
        </Box>
      )}
      <IconButton
        aria-label={
          isFullscreen ? 'Afslut fuld skærm' : 'Vis kort i fuld skærm'
        }
        color="primary"
        onClick={toggleFullscreen}
        sx={{
          position: 'absolute',
          top: 8,
          right: 8,
          bgcolor: 'background.paper',
          boxShadow: 1,
          '&:hover': { bgcolor: '#F7F9FC' },
        }}
      >
        {isFullscreen ? <FullscreenExitIcon /> : <FullscreenIcon />}
      </IconButton>
    </Box>
  );
}
