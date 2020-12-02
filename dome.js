let starMeshVertexShader = `
uniform float fov;

attribute vec3 customColor;
attribute float size;
attribute float vmag;
attribute float starseed;

varying vec3 vColor;
varying float trogvmag;
varying float trogfov;
varying float trogseed;

void main() 
{
    trogseed = starseed;
    vColor = customColor;
    vec4 mvPosition = modelViewMatrix * vec4( position, 1.0 );
    gl_PointSize = size;
    gl_Position = projectionMatrix * mvPosition;
    trogvmag = vmag;
    trogfov = fov;
}`

let starMeshFragmentShader = `
#define octaves 16
precision mediump float;

varying vec3 vColor;
varying float trogfov;
varying float trogvmag;
varying float trogseed;

uniform sampler2D pointTexture;
uniform float asynctime;


float rand(float n){return fract(sin(n) * 43758.5453123);}

float noise(float p){
    float fl = floor(p);
  float fc = fract(p);
    return mix(rand(fl), rand(fl + 1.0), fc);
}

float fbm(float x) {
    float v = 0.0;
    float a = 0.5;
    float shift = float(100);
    for (int i = 0; i < octaves; ++i) {
        v += a * noise(x);
        x = x * 2.0 + shift;
        a *= 0.5;
    }
    return v;
}


void main()
{
    #ifdef useTexture
        float minmag = 7.0 * 30.0/trogfov;
        if (minmag < 6.0) 
        {
            minmag = 6.0;
        }
        float alpha = minmag-trogvmag;
        if (alpha > 1.0)
        {
            alpha = fbm(((0.25 * trogvmag) + ((0.25 * trogvmag) * asynctime)) + trogseed);
        }
        if (alpha < 0.0)
        {
            alpha = 0.0;
        }
    
        gl_FragColor = vec4(vColor, alpha);
        gl_FragColor = gl_FragColor * texture2D( pointTexture, gl_PointCoord );
    #else
        gl_FragColor = vec4(vColor, 1.0);
    #endif
}
`


//Helper functions
function spher2cart(radius, phi, theta) {
    let sinPhiRadius = Math.cos(phi) * -radius;
    x = sinPhiRadius * Math.sin(-theta);
    y = Math.sin(phi) * radius;
    z = sinPhiRadius * Math.cos(-theta);
    return {
        x: x,
        y: y,
        z: z
    };
}

function calculateObjects(objects, camera) {
    let vertices = [];
    let colors = [];
    let pickingColors = [];
    let sizes = [];
    let vmags = [];
    let pickingSizes = [];

    let date = new Date();
    let origindate = new Date("January 1, 2000 05:19:16 GMT");
    let numberofyearssince2000 = (date.getTime() - origindate.getTime()) / 31556925216;


    let pickingColorTemp = new THREE.Color();
    for (let i = 0; i < objects.length; i++) {
        let RANow = objects[i].ra + ((3.074 + 1.337 * Math.sin(objects[i].ra * Math.PI / 180) * Math.tan(objects[i].dec * Math.PI / 180)) / 240) * numberofyearssince2000;
        let DecNow = objects[i].dec + ((20.049 * Math.cos(objects[i].ra * Math.PI / 180)) / 3600) * numberofyearssince2000;

        if (objects[i].vmag === 99) {
            continue;
        }

        if (objects[i].vmag === '?') {
            continue;
        }
        if (objects[i].vmag === -99) {
            continue;
        }
        if (objects[i].names[0] === 'Sun') {
            continue;
        }
        if (objects[i].names[0] === 'Earth') {
            continue;
        }

        let phi = DecNow * Math.PI / 180;
        let theta = -RANow * Math.PI / 180;
        let r = 1000;

        let coords = spher2cart(r, phi, theta);

        if (objects[i]['spectral-class']) {
            if (spectralClasses[objects[i]['spectral-class'].charAt(0).toUpperCase()]) {
                let color = spectralClasses[objects[i]['spectral-class'].charAt(0).toUpperCase()]
                colors.push(color.r, color.g, color.b);
            } else {
                colors.push(255, 255, 255);
            }
        } else {
            colors.push(255, 255, 255);
        }

        let pickingColor = pickingColorTemp.setHex(i + 1);

        pickingColors.push(pickingColor.r, pickingColor.g, pickingColor.b);

        let brightness = Math.sqrt(Math.pow(10, (((15 - objects[i].vmag) / 2.5) / Math.PI)));
        sizes.push(brightness);
        pickingSizes.push(brightness * 2);

        vertices.push(coords.x, coords.y, coords.z);
        objects[i].xyz = new THREE.Vector3(coords.x, coords.y, coords.z);
        vmags.push(objects[i].vmag)
    }

    return {
        vertices: vertices,
        sizes: sizes,
        colors: colors,
        pickingColors: pickingColors,
        vmags: vmags,
        pickingSizes: pickingSizes
    };
}
let spectralClasses = {};

spectralClasses['M'] = new THREE.Color(0xff8957);
spectralClasses['K'] = new THREE.Color(0xffc98f);
spectralClasses['G'] = new THREE.Color(0xfff8a6);
spectralClasses['F'] = new THREE.Color(0xffffff);
spectralClasses['A'] = new THREE.Color(0xf0f8ff);
spectralClasses['B'] = new THREE.Color(0xd4ebff);
spectralClasses['O'] = new THREE.Color(0xa6d7ff);
//Helper functions end

//BOILERPLATE FOR SKYDOME START
let canvas = document.getElementById('renderCanvas');
const canvasWidth = canvas.getBoundingClientRect().width;
const canvasHeight = canvas.getBoundingClientRect().height;

console.log(canvasWidth, canvasHeight);
let camera = new THREE.PerspectiveCamera(30, canvasWidth / canvasHeight, 1, 10000);
let trogcamera = new THREE.PerspectiveCamera(30, canvasWidth / canvasHeight, 1, 10000);


let renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true
});
renderer.setSize(canvasWidth, canvasHeight);
renderer.autoClear = false;
let scene = new THREE.Scene();;
let light = new THREE.AmbientLight(0x404040);
scene.add(light);
scene.background = new THREE.Color(0x00030a);

let skyDomeGeom = new THREE.SphereBufferGeometry(1000, 1000, 1000);
skyDomeGeom.scale(1, 1, -1);
let skyDomeTexture = new THREE.TextureLoader().load('images/yeet.png');
let skyDomeMaterial = new THREE.MeshBasicMaterial({
    map: skyDomeTexture,
    side: THREE.FrontSide,
    transparent: true,
    depthTest: false,
    alphaTest: 0.5
});
var tracking = "";
skyDomeMesh = new THREE.Mesh(skyDomeGeom, skyDomeMaterial);
skyDomeMesh.renderOrder = 0.1;
let controls = new THREE.OrbitControlsLocal(camera, renderer.domElement);
let trogcontrols = new THREE.OrbitControlsLocal(trogcamera, renderer.domElement);
camera.position.set(0, -1000, 0);
trogcamera.position.set(0, -1000, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.2;
controls.screenSpacePanning = false;
controls.maxDistance = 1000;
controls.minDistance = 1000;
controls.rotateSpeed = -1 / 250 * camera.fov;
controls.target = new THREE.Vector3(0, 0, 0)
trogcontrols.target = new THREE.Vector3(0, 0, 0)
controls.update();
trogcontrols.update();
camera.updateProjectionMatrix();
trogcamera.updateProjectionMatrix();

//BOILERPLATE FOR SKYDOME END

fetch('objects.json').then((resp) => {
    resp.json().then((objects) => {

        let asynctime = 0;
        let objectVertices = calculateObjects(objects, camera);

        let objMap = new THREE.BufferGeometry();
        objMap.setAttribute('position', new THREE.BufferAttribute(new Float32Array(objectVertices.vertices), 3));
        objMap.setAttribute('customColor', new THREE.BufferAttribute(new Float32Array(objectVertices.colors), 3));
        objMap.setAttribute('size', new THREE.BufferAttribute(new Float32Array(objectVertices.sizes), 1));
        objMap.setAttribute('vmag', new THREE.BufferAttribute(new Float32Array(objectVertices.vmags), 1));
        objMap.setAttribute('starseed', new THREE.BufferAttribute(new Float32Array(objectVertices.starSeeds), 1));

        console.log(objectVertices.starSeeds);
        objMap.computeBoundingSphere();

        let objMapMaterial = new THREE.ShaderMaterial({
            uniforms: {
                color: {
                    value: new THREE.Color(0xffffff)
                },
                pointTexture: {
                    value: new THREE.TextureLoader().load('images/star.png')
                },
                fov: {
                    value: camera.fov
                }
            },

            defines: {
                useTexture: true
            },

            vertexShader: starMeshVertexShader,
            fragmentShader: starMeshFragmentShader,
            depthTest: false,
            depthWrite: false,
            transparent: true,
        });
        canvas.onmousedown = () => {
            canvas.addEventListener('mousemove', mousemovehandler);
        }

        canvas.onmouseup = () => {
            canvas.removeEventListener('mousemove', mousemovehandler);
        }

        function mousemovehandler() {

            tracking = "";
            var vector = new THREE.Vector3(0, 0, -1)
            vector.applyQuaternion(camera.quaternion);
            vector.x = vector.x * 1000;
            vector.y = vector.y * 1000;
            vector.z = vector.z * 1000;
        }


        canvas.addEventListener('wheel', (e) => {
            if (camera.fov * 0.9 <= 0.025) {
                if (e.deltaY > 0) {
                    camera.fov = camera.fov / 0.9;

                    objMapMaterial.uniforms.fov.value = camera.fov;
                    pickingobjMapMaterial.uniforms.fov.value = camera.fov;

                    controls.rotateSpeed = -1 / 250 * camera.fov;
                    camera.updateProjectionMatrix();
                }
                return;
            }

            if (camera.fov * 1.1 >= 235 / 2) {
                if (e.deltaY < 0) {
                    camera.fov = camera.fov * 0.9;

                    objMapMaterial.uniforms.fov.value = camera.fov;
                    pickingobjMapMaterial.uniforms.fov.value = camera.fov;

                    controls.rotateSpeed = -1 / 250 * camera.fov;
                    camera.updateProjectionMatrix();
                }
                return;
            }

            if (e.deltaY < 0) {
                camera.fov = camera.fov * 0.9;

                objMapMaterial.uniforms.fov.value = camera.fov;
                pickingobjMapMaterial.uniforms.fov.value = camera.fov;

                controls.rotateSpeed = -1 / 500 * camera.fov;
            } else {
                camera.fov = camera.fov / 0.9;

                objMapMaterial.uniforms.fov.value = camera.fov;
                pickingobjMapMaterial.uniforms.fov.value = camera.fov;

                controls.rotateSpeed = -1 / 250 * camera.fov;
            }
            console.log(camera.fov)
            camera.updateProjectionMatrix();
        });
        let points = new THREE.Points(objMap, objMapMaterial);
        scene.add(points);
        scene.add(skyDomeMesh);

        let pickingScene = new THREE.Scene();
        pickingScene.background = new THREE.Color(0x000000);

        let pickingTexture = new THREE.WebGLRenderTarget(canvasWidth, canvasHeight);
        let pixelBuffer = new Uint8Array(4);
        let pickingObjMap = objMap.clone();
        let pickingobjMapMaterial = objMapMaterial.clone();
        let pickingSizes = objectVertices.sizes;

        objMap.renderOrder = 0.2;
        pickingobjMapMaterial.defines.useTexture = false;
        pickingObjMap.setAttribute("customColor", new THREE.BufferAttribute(new Float32Array(objectVertices.pickingColors), 3));
        pickingObjMap.setAttribute("size", new THREE.BufferAttribute(new Float32Array(objectVertices.pickingSizes), 1));

        let pickingPoints = new THREE.Points(pickingObjMap, pickingobjMapMaterial);
        pickingScene.add(pickingPoints)

        canvas.addEventListener('click', (e) => {
            renderer.setRenderTarget(pickingTexture)
            renderer.render(pickingScene, camera);
            renderer.setRenderTarget(null);

            let x = e.clientX * window.devicePixelRatio;
            let y = pickingTexture.height - e.clientY * window.devicePixelRatio;
            renderer.readRenderTargetPixels(pickingTexture, x, y, 1, 1, pixelBuffer);

            let id = (pixelBuffer[0] << 16) | (pixelBuffer[1] << 8) | (pixelBuffer[2]) - 1;

            if (id !== -1) {
                console.log('You picked ' + objects[id].names[0] + '!');
            }
        })
        
        canvas.addEventListener('dblclick', (e) => {
            renderer.setRenderTarget(pickingTexture)
            renderer.render(pickingScene, camera);
            renderer.setRenderTarget(null);

            let x = e.clientX * window.devicePixelRatio;
            let y = pickingTexture.height - e.clientY * window.devicePixelRatio;
            renderer.readRenderTargetPixels(pickingTexture, x, y, 1, 1, pixelBuffer);

            let id = (pixelBuffer[0] << 16) | (pixelBuffer[1] << 8) | (pixelBuffer[2]) - 1;

            if (id !== -1) {
                tracking = objects[id].names[0];

                var vec = new THREE.Vector3(objects[id].xyz.x, objects[id].xyz.y, objects[id].xyz.z);
                var vec2 = new THREE.Vector3(objects[id].xyz.x, objects[id].xyz.y, objects[id].xyz.z);
                skyDomeMesh.worldToLocal(vec2);
                smoothtarget(vec2).then(() => {
                    yeet(vec, objects[id].names[0]);
                })
            }
        })
    });
});

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

skyDomeMesh.add(camera);
skyDomeMesh.add(trogcamera);
skyDomeMesh.rotation.z = -(90 - 32.8407) * Math.PI / 180;
let origindate = new Date("January 1, 2000 05:19:16 GMT")
let deltadays = (Date.now() - origindate.getTime()) / 86164090;
let rotationoffset = (deltadays * 2 * Math.PI + -83.634705 * Math.PI / 180) % (2 * Math.PI);
skyDomeMesh.rotation.y = rotationoffset - Math.PI / 2;

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
    skyDomeMesh.rotation.y += 0.00005;
}
animate();