import { Matrix4, Vector3,
    PerspectiveCamera,
    DirectionalLight,
    AmbientLight,
    Scene, WebGLRenderer,
  } from "three";
  
  import { IFCLoader } from "web-ifc-three";
  
  const lat = document.getElementById('lat');
  const lng = document.getElementById('lng');
  let filtersoup = ["all"];
  const modelOrigin = [lat.value, lng.value];
  const modelAltitude = 10;
  const modelRotate = [Math.PI / 2, 0, 0];
  const modelAsMercatorCoordinate = mapboxgl.MercatorCoordinate.fromLngLat(modelOrigin, modelAltitude);
   
  const modelTransform = {
    translateX: modelAsMercatorCoordinate.x,
    translateY: modelAsMercatorCoordinate.y,
    translateZ: modelAsMercatorCoordinate.z,
    rotateX: modelRotate[0],
    rotateY: modelRotate[1],
    rotateZ: modelRotate[2],
    scale: modelAsMercatorCoordinate.meterInMercatorCoordinateUnits()
  };

  mapboxgl.accessToken = 'pk.eyJ1IjoiaGlkZGUtdmliZXMiLCJhIjoiY2xhdGd6djZxMDBweDNwcno3eHMwZjZnYSJ9.y34yz7i9TANUsSYYPabwVw';
  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v10',
    zoom: 18,
    center: [lat.value, lng.value],
    pitch: 60,
    bearing: -70,
    antialias: true
  });

  const scene = new Scene();
  const camera = new PerspectiveCamera();
  const renderer = new WebGLRenderer({
    canvas: map.getCanvas(),
    antialias: true,
  });
  renderer.autoClear = false;
  
  const customLayer = {
  
    id: '3d-model',
    type: 'custom',
    renderingMode: '3d',
  
    onAdd: function () {
      const directionalLight = new DirectionalLight(0x404040);
      const directionalLight2 = new DirectionalLight(0x404040);
      const ambientLight = new AmbientLight( 0x404040, 3 );
  
      directionalLight.position.set(0, -70, 100).normalize();
      directionalLight2.position.set(0, 70, 100).normalize();
  
      scene.add(directionalLight, directionalLight2, ambientLight);
  },
    render: function (gl, matrix) {
      const rotationX = new Matrix4().makeRotationAxis(
      new Vector3(1, 0, 0), modelTransform.rotateX);
      const rotationY = new Matrix4().makeRotationAxis(
      new Vector3(0, 1, 0), modelTransform.rotateY);
      const rotationZ = new Matrix4().makeRotationAxis(
      new Vector3(0, 0, 1), modelTransform.rotateZ);
    
      const m = new Matrix4().fromArray(matrix);
      const l = new Matrix4()
      .makeTranslation(
      modelTransform.translateX,
      modelTransform.translateY,
      modelTransform.translateZ
      )
      .scale(
      new Vector3(
      modelTransform.scale,
      -modelTransform.scale,
      modelTransform.scale)
      )
      .multiply(rotationX)
      .multiply(rotationY)
      .multiply(rotationZ);
      
      camera.projectionMatrix = m.multiply(l);
      renderer.resetState();
      renderer.render(scene, camera);
      map.triggerRepaint();
    }

  };

  map.on('style.load', () => {
    map.addLayer(customLayer, 'waterway-label');
  });

  map.on('load', () => {
  // Insert the layer beneath any symbol layer.
    const layers = map.getStyle().layers;
    const labelLayerId = layers.find(
        (layer) => layer.type === 'symbol' && layer.layout['text-field']
    ).id;

    map.setLayoutProperty('building', 'visibility', 'none');

  // The 'building' layer in the Mapbox Streets
  // vector tileset contains building height data
  // from OpenStreetMap.
    map.addLayer(
        {
          'id': '3d-buildings',
          'source': 'composite',
          'source-layer': 'building',
          'filter': ['==', 'extrude', 'true'],
          'type': 'fill-extrusion',
          'minzoom': 15,
          'paint': {
            'fill-extrusion-color': '#aaa',
  
            // Use an 'interpolate' expression to
            // add a smooth transition effect to
            // the buildings as the user zooms in.
            'fill-extrusion-height': [
              'interpolate',
              ['linear'],
              ['zoom'],
              15,
              0,
              15.05,
              ['get', 'height']
            ],
            'fill-extrusion-base': [
              'interpolate',
              ['linear'],
              ['zoom'],
              15,
              0,
              15.05,
              ['get', 'min_height']
            ],
            'fill-extrusion-opacity': 0.6
          }
        },
        labelLayerId
    );
    
    // When a click event occurs on a feature in the states layer,
    // open a popup at the location of the click, with description
    // HTML from the click event's properties.
    map.on('click', function(e){
      var bbox = [[e.point.x - 5, e.point.y-5],[e.point.x+5, e.point.y+5]];

      var features = map.queryRenderedFeatures(bbox,{
        layers: ['3d-buildings']
      });

      var filter = features.reduce(function(memo, feature){
        memo.push(["!=", ["id"], feature.id]);
        return memo;
      },  ['all', ['!=', ["id"], -1]]);

      for(var i = 1; i < filter.length; i++)
      {
        filtersoup.push(filter[i]);
      }
      console.log(filtersoup);
      map.setFilter("3d-buildings", filtersoup);

    });
      

    // Change the cursor to a pointer when
    // the mouse is over the states layer.
    map.on('mouseenter', 'building', () => {
      map.getCanvas().style.cursor = 'pointer';
      });
      
      // Change the cursor back to a pointer
      // when it leaves the states layer.
      map.on('mouseleave', 'building', () => {
      map.getCanvas().style.cursor = '';
      });

  });

  // Sets up the IFC loading
  const ifcLoader = new IFCLoader();
  ifcLoader.ifcManager.setWasmPath("/");
  ifcLoader.ifcManager.applyWebIfcConfig ({ USE_FAST_BOOLS: true });
  const input = document.getElementById("file-input");
  input.addEventListener(
    "change",
    (changed) => {
      console.log("loading ifc model")
      const file = changed.target.files[0];
      var ifcURL = URL.createObjectURL(file);
      ifcLoader.load(
            ifcURL,
            (ifcModel) => {
              scene.add(ifcModel);
              //ifcModel.position.x = -35;
              //ifcModel.position.z = 32.5;
              //ifcModel.position.y = -1.4;
              console.log(ifcModel)
            });
      
    },
    false
  );



  lat.addEventListener(
    'change',
    (event) => {
      console.log(event.target.value);
    }
  );

  lng.addEventListener(
    'change',
    (event) => {
      console.log(event.target.value);
    }
  );

  document.getElementById('fly').addEventListener('click', () => {
    lattitude = lat.value;
    longitude = lng.value;

    map.flyTo({
    center: [lattitude, longitude],
    duration: 0,
    essential: true,
    });
  });

  document.getElementById('reset').addEventListener('click', () => {
    filtersoup = ["all"];
    console.log(filtersoup);
    map.setFilter("3d-buildings", filtersoup);
  });