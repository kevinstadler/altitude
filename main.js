import 'ol/ol.css';
import { Map, View } from 'ol';
import { Point } from 'ol/geom';
import { MVT } from 'ol/format';
import VectorTile from 'ol/source/VectorTile';
import { VectorTile as VectorTileLayer } from 'ol/layer';
import { Fill, RegularShape, Stroke, Style, Text } from 'ol/style';
import { fromLonLat, toLonLat } from 'ol/proj';
import { getArea } from 'ol/extent';

const key = 'pk.eyJ1Ijoia2V2aW5zdGFkbGVyIiwiYSI6ImNrbXJid3RsZzA2ZzAydW82OWMydHNvZ3cifQ.tJeo9sikGfaRADQUwGcw9Q';

const waterColor = '#cef';
const waterStyle = new Style({
  zIndex: 3,
  fill: new Fill({
    color: waterColor,
  })
});
const waterWayWidths = { river: 8, canal: 4, stream: 2, drain: 1, ditch: 1 };

const waterWayStyle = (f, r) => {
  const styles = [new Style({
    zIndex: 1,
    stroke: new Stroke({
      color: waterColor,
      width: waterWayWidths[f.get('class')] * 8 / r,
      lineCap: 'square', // because of tile boundaries
      lineJoin: 'bevel',
    })
  })];
  for (let i = 2; i < f.getGeometry().flatCoordinates_.length; i += 2) {
    var dx = f.getGeometry().flatCoordinates_[i] - f.getGeometry().flatCoordinates_[i-2];
    var dy = f.getGeometry().flatCoordinates_[i+1] - f.getGeometry().flatCoordinates_[i-1];
    var rotation = Math.atan2(dy, dx);
    styles.push(new Style({
      geometry: new Point(f.getGeometry().flatCoordinates_.slice(i, i+2)),
      image: new RegularShape({
        fill: new Fill({ color: '#00a' }),
        points: 3,
        radius: 3,
        rotation: -rotation,
        angle: Math.PI / 2 // rotate 90°
      })
    }));
  }
  return styles;
};

const elevationLayer = new VectorTileLayer({
  declutter: true,
//  renderMode: 'image',
  minZoom: 10, // exclusive
  source: new VectorTile({
    minZoom: 10,
    attributions:
      '© <a href="https://www.mapbox.com/map-feedback/">Mapbox</a> ' +
      '© <a href="https://www.openstreetmap.org/copyright">' +
      'OpenStreetMap contributors</a>',
    format: new MVT(),
    url: 'https://{a-d}.tiles.mapbox.com/v4/mapbox.mapbox-terrain-v2/{z}/{x}/{y}.vector.pbf?access_token=' + key,
  }),
});

const roadStyles = {
  motorway: { color: '#fff', width: 6 },
  trunk: { color: '#f00', width: 4 },
  primary: { color: '#600', width: 3 },
  secondary: { color: '#300', width: 2 },
  tertiary: { color: '#000', width: 2 },
  street: { color: '#000', width: 1 },
  street_limited: { color: '#000', width: 1, dash: [3, 3] }, // probable access
  pedestrian: { color: '#000', width: 1, dash: [3, 3] }, // probable access
  track: { color: '#000', width: 1, dash: [1, 1] },
  service: { color: 'gray', width: 1 },
  path: { color: '#000', width: 1, dash: [6, 6] },
//  railway: { color: 'gray', width: 1, dash: [6, 6] }, // openmaptiles
  major_rail: { color: 'gray', width: 1, dash: [6, 6] },
  minor_rail: { color: 'gray', width: 1, dash: [6, 6] },
  service_rail: { color: 'gray', width: 1, dash: [6, 6] },
}

const setMapboxStyles = (r) => {
  console.log(r);
}

const roadStyle = (f, r) => {
  const style = roadStyles[f.get('class')];
  const dash = (f.get('structure') === 'tunnel') ? [style.width * 10, style.width * 20] : style.dash;
  // TODO check 'structure' for bridge/ford?
  return new Style({
    stroke: new Stroke({
      width: style.width * 10 / r,
      color: (f.get('bike_lane') in ['yes', 'both']) ? 'black' : style.color,
      lineDash: dash === undefined ? [] : dash.map(l => l * 10 / r),
      lineCap: 'butt',
      lineJoin: 'round',
    })
  })
};

const fillStyle = (color) => new Style({
  zIndex: -1,
  fill: new Fill({ color: color })
});

const landuseStyles = {
  // https://docs.mapbox.com/vector-tiles/reference/mapbox-streets-v8/#--landuse---class-text
  agriculture: fillStyle('#aa03'), // mapbox
  farmland: fillStyle('#aa03'), // openmaptiles
  grass: fillStyle('#0a03'),
  park: fillStyle('#0a03'),
  rock: fillStyle('#aaaa'),
  scrub: fillStyle('#0a06'),
  wood: fillStyle('#0206'),
};

const map = new Map({
  target: 'map',
  layers: [
    elevationLayer,
    // new VectorTileLayer({
    //   declutter: true,
    //   style: (f, r) => {
    //     if (f.get('layer') === 'road' && f.get('class') in roadStyles) {
    //       return roadStyle(f, r);
    //     } else if (f.get('layer') === 'waterway') {
    //       return waterWayStyle(f, r);
    //     } else if (f.get('layer') === 'landuse' && f.get('class') in landuseStyles) {
    //       return landuseStyles[f.get('class')];
    //     } else if (f.get('layer') === 'place_label' && f.get('class') === 'settlement' && f.get('symbolrank') <= 14) {
    //       // settlement_subdivision also ok
    //       const label = (f.get('name_script') !== 'Latin' && f.get('name_en')) ? f.get('name') + '\n' + f.get('name_en') : f.get('name');
    //       return new Style({ zIndex: f.get('symbolrank'), text: getText(label, 22 - f.get('symbolrank')) });
    //     } else if (f.get('layer') === 'natural_label' && f.get('class') === 'landform') {
    //       return new Style({ text: getText(f.get('name') + '\n' + f.get('elevation_m') + 'm') });
    //     }
    //   },
    //   source: new VectorTile({
    //     format: new MVT(),
    //     url: 'https://{a-d}.tiles.mapbox.com/v4/mapbox.mapbox-streets-v8/{z}/{x}/{y}.vector.pbf?access_token=' + key,
    //   })
    // }),
    new VectorTileLayer({
      zIndex: 100,
      source: new VectorTile({
        attributions: 'OpenMapTiles by MapTiler',
        format: new MVT(),
        maxZoom: 14,
        url: 'https://api.maptiler.com/tiles/v3/{z}/{x}/{y}.pbf?key=qu62rKisigsebPda2e6b',
      }),
      declutter: true,
      style: (f, r) => {
        //https://openmaptiles.org/schema/#fields
        if (f.get('layer') === 'landcover' && f.get('class') in landuseStyles) {
          return landuseStyles[f.get('class')];
        } else if (f.get('layer') === 'transportation' && f.get('class') in roadStyles) {
          return roadStyle(f, r);
        } else if (f.get('layer') === 'water') {
          return waterStyle;
        } else if (f.get('layer') === 'waterway') {
          return waterWayStyle(f, r);
        } else if (f.get('layer') === 'mountain_peak') {
          return new Style({ text: getText(f.get('name') + '\n' + f.get('ele') + 'm') });
        }
      },
    }),
  ],
  view: new View({
    center: fromLonLat([102.7, 24.75]),
    zoom: 10.5,
  })
});


const thinStroke = new Stroke({
  color: '#444',
  width: .1,
});

const thickStroke = new Stroke({
  color: '#444',
  width: .3,
})

const getText = (label, size = 10) => new Text({
  font: size + 'px Courier',
  placement: 'line',
  textBaseline: 'middle',
  text: label,
  fill: new Fill({ color: 'black' }),
  stroke: new Stroke({ color: 'white', width: 1 }),
});

var contourStyles = {};

// contour intervals
const intervals = [500, 500, 500, 500, 500, 500, 500, 500, 500, // 0 - 8
                   500, 200, 100,  50,  20,  10,  10,  10,  10 ]; // 9 - 17

const setLevels = () => {
//  setMapboxStyles(map.getView().getResolution());
  const zoom = Math.round(map.getView().getZoom());
  if (zoom <= elevationLayer.getMinZoom()) {
    return;
  }
  const fts = elevationLayer.getSource().getFeaturesInExtent(map.getView().calculateExtent()).filter((f) => f.get('layer') === 'contour');
  if (!fts.length) {
    return;
  }
  // for best colour distribution actually need to calculate the AREA occupied by each layer,
  // then generate nice spacing of boundaries so that each color occupies the same proportion
  // of the screen (otherwise the peaks get all the color shades, valleys all the same)
  const areas = { };
  for (let f of fts) {
    if (f.get('ele') in areas) {
      areas[f.get('ele')] += getArea(f.getExtent());
    } else {
      areas[f.get('ele')] = getArea(f.getExtent());
    }
  }
//  const eles = [...new Set(values)];
  const eles = Object.keys(areas);

  const sum = Object.values(areas).reduce((ac, el) => ac+el, 0);
  const cumPropAreas = Object.values(areas).map(v => v / sum).map((sum => value => sum += value)(0));
  const eleColors = cumPropAreas.map(cum => 'hsl(' + (150 - 170 * cum + ', 100%, 92%)'));
  console.log(eles);
  console.log(cumPropAreas);
//  const thresholdIndices = [0, .1, .2, .3, .4, .5, .6, .7, .8, .9].map(thr => cumPropAreas.findIndex((el) => el >= thr));
//  console.log(thresholdIndices.map(i => Object.keys(areas)[i]))

  const indexedMultiples = Math.max(100, 4 * intervals[zoom]);
  contourStyles = Object.fromEntries(Object.keys(areas).map((ele, i) => [ele,
    new Style({
      fill: new Fill({
        color: eleColors[i],
      }),
      stroke: (ele % indexedMultiples) ? thinStroke : thickStroke,
      text: (ele % indexedMultiples) ? undefined : getText(ele),
    })
  ]));
  document.getElementById('legend').style.background = 'linear-gradient(to top, ' + eleColors.map((c, i) => c + ' ' + 100*i/eleColors.length + '%, ' + c + ' ' + 100*(i+1)/eleColors.length + '%').join(', ') + ')';
};

const hillshadeStyles = {
  56: fillStyle('#00000028'),
  67: fillStyle('#00000010'),
  78: fillStyle('#0000000b'),
  89: fillStyle('#00000006'),
  90: fillStyle('#ffffff06'),
  94: fillStyle('#ffffff0b'),
};

// get style for the given elevation
elevationLayer.setStyle((f, r) => {
  if (f.get('layer') == 'contour') {
    return contourStyles[f.get('ele')];
  } else if (f.get('layer') === 'hillshade') {
    return hillshadeStyles[f.get('level')];
  }
});

map.on('moveend', setLevels);
map.once('rendercomplete', () => {
  setLevels();
  elevationLayer.getSource().changed();
});
