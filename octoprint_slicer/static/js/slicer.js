/*
 * View model for OctoPrint-Slicer
 *
 * Author: Kenneth Jiang
 * License: AGPLv3
 */
$(function() {
    function SlicerViewModel(parameters) {
        var self = this;

        // assign the injected parameters, e.g.:
        // self.loginStateViewModel = parameters[0];
        // self.settingsViewModel = parameters[1];

        self.onEventUpdatedFiles = function(payload) {
        ko.contextFor($('.btn-mini[title="Slice"]')[0]).$root.sliceFile = function() {
            $('a[href="#tab_plugin_slicer"]').tab('show');
        };
        };

        var container;

        var camera, cameraTarget, scene, renderer, orbitControl, transformControl,
        CANVAS_WIDTH = 588,
            CANVAS_HEIGHT = 588;

        self.init = function() {
            container = document.getElementById( 'slicer-canvas' );

            camera = new THREE.PerspectiveCamera( 45, 1.0, 0.1, 100 );
            camera.up.set( 0, 0, 1 );
            camera.position.set( 3, 2, 3 );
            scene = new THREE.Scene();
            scene.add( self.bedFloor() );

            var loader = new THREE.STLLoader();
            loader.load(BASEURL + "downloads/files/" + "local" + "/" + "fish_fossilz.stl", function ( geometry ) {

                var material = new THREE.MeshPhongMaterial( { color: 0xff5533, specular: 0x111111, shininess: 200 } );
                var mesh = new THREE.Mesh( geometry, material );
                mesh.scale.set( 0.02, 0.02, 0.02 );

                scene.add( mesh );
                transformControls.attach(mesh);
                self.updateTransformInputs();
                self.render();
            } );


            // Lights

            scene.add( new THREE.AmbientLight(0xffffff, 1.0) );

            // renderer

            renderer = new THREE.WebGLRenderer( { antialias: true } );
            renderer.setSize( CANVAS_WIDTH, CANVAS_HEIGHT );
            renderer.setPixelRatio( window.devicePixelRatio );

            renderer.gammaInput = true;
            renderer.gammaOutput = true;

            $("#slicer-viewport").empty().append(`
                    <div class="model">
                    <button class="translate disabled" title="Translate"><img src="` + PLUGIN_BASEURL + `slicer/static/img/translate.png"></button>
                    <button class="rotate" title="Rotate"><img src="` + PLUGIN_BASEURL + `slicer/static/img/rotate.png"></button>
                    <button class="scale" title="Scale"><img src="` + PLUGIN_BASEURL + `slicer/static/img/scale.png"></button>
                    </div>
                    <div class="values translate">
                    <div>
                    <p><span class="axis x">X</span><input type="number" step="any" name="x" min=""><span title="">mm</span></p>
                    <p><span class="axis y">Y</span><input type="number" step="any" name="y" min=""><span title="">mm</span></p>
                    <span></span>
                    </div>
                    </div>
                    <div class="values rotate">
                    <div>
                    <p><span class="axis x">X</span><input type="number" step="any" name="x" min=""><span title="">°</span></p>
                    <p><span class="axis y">Y</span><input type="number" step="any" name="y" min=""><span title="">°</span></p>
                    <p><span class="axis z">Z</span><input type="number" step="any" name="z" min=""><span title="">°</span></p>
                    <span></span>
                    </div>
                    </div>
                    `);

            $("#slicer-viewport").append(renderer.domElement);
            orbitControls = new THREE.OrbitControls(camera, renderer.domElement);
            orbitControls.enableDamping = true;
            orbitControls.dampingFactor = 0.25;
            orbitControls.enablePan = false;
            orbitControls.addEventListener("change", self.render);

            transformControls = new THREE.TransformControls(camera, renderer.domElement);
            transformControls.space = "world";
            transformControls.setAllowedTranslation("XY");
            transformControls.setRotationDisableE(true);
            transformControls.addEventListener("change", self.render);
            transformControls.addEventListener("mouseDown", self.startTransform);
            transformControls.addEventListener("mouseUp", self.endTransform);
            transformControls.addEventListener("change", self.updateTransformInputs);
            scene.add(transformControls);

            $("#slicer-viewport button.translate").click(function(event) {
                // Set selection mode to translate
                transformControls.setMode("translate");
                $("#slicer-viewport button.translate").removeClass("disabled");
                $("#slicer-viewport .values div").removeClass("show")
                    $("#slicer-viewport .translate.values div").addClass("show").children('p').addClass("show");
            });
            $("#slicer-viewport button.rotate").click(function(event) {
                // Set selection mode to rotate 
                transformControls.setMode("rotate");
                $("#slicer-viewport button.rotate").removeClass("disabled");
                $("#slicer-viewport .values div").removeClass("show")
                    $("#slicer-viewport .rotate.values div").addClass("show").children('p').addClass("show");
            });
            $("#slicer-viewport .values input").change(function() {
                self.applyChange($(this));
            });

        };

        self.applyChange = function(input) {
            input.blur();
            if(!isNaN(parseFloat(input.val()))) {
                input.val(parseFloat(input.val()).toFixed(3));
                var model = transformControls.object;

                if (input.closest(".values").hasClass("rotate")) {
                    switch(input.attr("name")) {
                        case "x":
                            model.rotation.x = THREE.Math.degToRad(parseFloat(input.val()));
                            break;
                        case "y":
                            model.rotation.y = THREE.Math.degToRad(parseFloat(input.val()));
                            break;
                        case "z":
                            model.rotation.z = THREE.Math.degToRad(parseFloat(input.val()));
                            break;
                    }
                } else if (input.closest(".values").hasClass("translate")) {
                    switch(input.attr("name")) {
                        case "x":
                            model.position.x = -parseFloat(input.val());
                            break;
                        case "y":
                            model.position.y = -parseFloat(input.val());
                            break;
                    }
                }
                render();
            }
        };

        self.startTransform = function () {
            // Disable orbit controls
            orbitControls.enabled = false;
        };

        self.endTransform = function () {
            // Enable orbit controls
            orbitControls.enabled = true;
        };

        self.updateTransformInputs = function () {
            var model = transformControls.object;
            $("#slicer-viewport .translate.values input[name=\"x\"]").val((model.position.x.toFixed(3) == 0 ? 0 : -model.position.x).toFixed(3)).attr("min", '');
            $("#slicer-viewport .translate.values input[name=\"y\"]").val(model.position.y.toFixed(3)).attr("min", '');
            $("#slicer-viewport .rotate.values input[name=\"x\"]").val((model.rotation.x * 180 / Math.PI).toFixed(3)).attr("min", '');
            $("#slicer-viewport .rotate.values input[name=\"y\"]").val((model.rotation.y * 180 / Math.PI).toFixed(3)).attr("min", '');
            $("#slicer-viewport .rotate.values input[name=\"z\"]").val((model.rotation.z * 180 / Math.PI).toFixed(3)).attr("min", '');
        };

        self.bedFloor = function ( segments ) {
            segments = segments || 20;
            var geometry = new THREE.PlaneGeometry(4, 4, segments, segments);
            var materialEven = new THREE.MeshBasicMaterial({color: 0xccccfc});
            var materialOdd = new THREE.MeshBasicMaterial({color: 0x444464});
            var materials = [materialEven, materialOdd];
        
            for (var x = 0; x < segments; x++) {
              for (var y = 0; y < segments; y++) {
                var i = x * segments + y;
                var j = 2 * i;
                geometry.faces[ j ].materialIndex = geometry.faces[ j + 1 ].materialIndex = (x + y) % 2;
              }
            }
        
            return new THREE.Mesh(geometry, new THREE.MeshFaceMaterial(materials));
        };

        self.render = function() {
            orbitControls.update();
            transformControls.update();
            renderer.render( scene, camera );
        };

        self.init();
        self.render();


    }

    // view model class, parameters for constructor, container to bind to
    OCTOPRINT_VIEWMODELS.push([
            SlicerViewModel,

            // e.g. loginStateViewModel, settingsViewModel, ...
            [ /* "loginStateViewModel", "settingsViewModel" */ ],

            // e.g. #settings_plugin_slicer, #tab_plugin_slicer, ...
            [ /* ... */ ]
    ]);
});
