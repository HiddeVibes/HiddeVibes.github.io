import { Matrix4, Vector3,
    PerspectiveCamera,
    DirectionalLight,
    AmbientLight,
    Scene, WebGLRenderer,
  } from "three";
  
  import { IFCLoader } from "web-ifc-three";
  
  mapboxgl.accessToken = 'pk.eyJ1IjoiaGlkZGUtdmliZXMiLCJhIjoiY2xhdGd6djZxMDBweDNwcno3eHMwZjZnYSJ9.y34yz7i9TANUsSYYPabwVw';
  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/light-v10',
    zoom: 19.5,
    center: [5.662889884778613, 52.02064642420796],
    pitch: 60,
    bearing: -70,
    antialias: true
  });
  
  const modelOrigin = [5.662889884778613, 52.02064642420796];
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
      const ifcLoader = new IFCLoader();
      ifcLoader.ifcManager.applyWebIfcConfig({
        USE_FAST_BOOLS: true
      });
      
      ifcLoader.load( './Dulon_mass.ifc', function ( model ) {
        scene.add( model );
        model.position.x = -35;
        model.position.z = 32.5;
        model.rotation.y = -1.4;
      });
  
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


  // The 'building' layer in the Mapbox Streets
  // vector tileset contains building height data
  // from OpenStreetMap.
    map.addLayer(
        {
          'id': 'add-3d-buildings',
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
      var features = map.queryRenderedFeatures(e.point,{
        layers: ['building']
      });
      console.log(features);
      console.log(features[0].properties['extrude']);
      features[0].properties['extrude'] = 'false';
      map.triggerRepaint();
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