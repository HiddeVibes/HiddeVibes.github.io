

    async function setUpMultiThreading(ifcLoader) {
        const manager = ifcLoader.ifcManager;
        await manager.useWebWorkers(true, "/node_modules/web-ifc-three/IFCWorker.js");
        await manager.setWasmPath("/dist/wasmDir/");
      }
      


  module.exports = setUpMultiThreading;
