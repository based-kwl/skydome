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
}`;

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
function spher2cart(radius, phi, theta)
{
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

function calculateObjects(objects, camera) 
{
    let date = new Date();
    let origindate = new Date('January 1, 2000 05:19:16 GMT');
    let numberofyearssince2000 = (date.getTime() - origindate.getTime()) / 31556925216;
    let pickingColorTemp = new THREE.Color();

    //For shader
    let vertices = [];
    let colors = [];
    let pickingColors = [];
    let sizes = [];
    let vmags = [];
    let pickingSizes = [];
    let starSeeds = [];

    //Metadata
    let info = {};

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
        info[i] = {'vectors': new THREE.Vector3(coords.x, coords.y, coords.z), 'id': objects[i].index};
        vmags.push(objects[i].vmag);
        starSeeds.push(Math.floor(Math.random() * (1000 - 0 + 1) + 0));
    }

    return {
        vertices: vertices,
        sizes: sizes,
        colors: colors,
        pickingColors: pickingColors,
        vmags: vmags,
        pickingSizes: pickingSizes,
        info: info,
        starSeeds: starSeeds
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
let renderer = new THREE.WebGLRenderer(
{
    canvas: canvas,
    antialias: true,
    alpha: true
});
renderer.setSize(canvasWidth, canvasHeight);
renderer.autoClear = false;
let scene = new THREE.Scene();;
let light = new THREE.AmbientLight(0x404040);
scene.add(light);
scene.background = new THREE.Color(0x111111);

let skyDomeGeom = new THREE.SphereBufferGeometry(1000, 1000, 1000);
skyDomeGeom.scale(1, 1, -1);
let skyDomeTexture = new THREE.TextureLoader().load('images/yeet.png');
let skyDomeMaterial = new THREE.MeshBasicMaterial(
{
    map: skyDomeTexture,
    side: THREE.FrontSide,
    transparent: true,
    depthTest: false,
    alphaTest: 0.5
});
skyDomeMesh = new THREE.Mesh(skyDomeGeom, skyDomeMaterial);
skyDomeMesh.renderOrder = 0.1;
let controls = new THREE.OrbitControlsLocal(camera, renderer.domElement);
camera.position.set(0, 0, 0);
controls.enableDamping = true;
controls.dampingFactor = 0.2;
controls.screenSpacePanning = false;
controls.maxDistance = 1000;
controls.minDistance = 1000;
controls.rotateSpeed = -1 / 100 * camera.fov;
controls.update();
//BOILERPLATE FOR SKYDOME END

fetch('objects.json').then((resp) =>
{
    resp.text().then((objects) =>
    {
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

        let objMapMaterial = new THREE.ShaderMaterial(
        {
            uniforms:
            {
                color:
                {
                    value: new THREE.Color(0xffffff)
                },
                pointTexture:
                {
                    value: new THREE.TextureLoader().load('images/star.png')
                },
                fov:
                {
                    value: camera.fov
                },
                asynctime:
                {
                    value: 0
                }
            },

            defines:
            {
                useTexture: true
            },

            vertexShader: starMeshVertexShader,
            fragmentShader: starMeshFragmentShader,
            depthTest: false,
            depthWrite: false,
            transparent: true,
            depthTest: 0.5
        });

        canvas.addEventListener('wheel', (e) =>
        {
            console.log(camera.fov)
            if (camera.fov * 0.9 <= 0.025)
            {
                if (e.deltaY > 0)
                {
                    camera.fov = camera.fov / 0.9;
                    objMapMaterial.uniforms.fov.value = camera.fov;
                    controls.rotateSpeed = -1 / 100 * camera.fov;
                    camera.updateProjectionMatrix();
                }
                return;
            }

            if (camera.fov * 1.1 >= 235 / 2)
            {
                if (e.deltaY < 0)
                {
                    camera.fov = camera.fov * 0.9;
                    objMapMaterial.uniforms.fov.value = camera.fov;
                    controls.rotateSpeed = -1 / 100 * camera.fov;
                    camera.updateProjectionMatrix();
                }
                return;
            }

            if (e.deltaY < 0)
            {
                camera.fov = camera.fov * 0.9;
                objMapMaterial.uniforms.fov.value = camera.fov;
                controls.rotateSpeed = -1 / 100 * camera.fov;
            }
            else
            {
                camera.fov = camera.fov / 0.9;
                objMapMaterial.uniforms.fov.value = camera.fov;
                controls.rotateSpeed = -1 / 100 * camera.fov;
            }
            camera.updateProjectionMatrix();
        });
        let points = new THREE.Points(objMap, objMapMaterial);
        scene.add(points);
        scene.add(skyDomeMesh);

        var pickingScene = new THREE.Scene();
        pickingScene.background = new THREE.Color(0x000000);
        var pickingTexture = new THREE.WebGLRenderTarget(canvasWidth, canvasHeight);
        var pixelBuffer = new Uint8Array(4);
        objMap.renderOrder = 0.2;
        let pickingObjMap = objMap.clone();
        let pickingobjMapMaterial = objMapMaterial.clone();
        pickingobjMapMaterial.defines.useTexture = false;
        pickingObjMap.setAttribute('customColor', new THREE.BufferAttribute(new Float32Array(objectVertices.pickingColors), 3));

        let pickingPoints = new THREE.Points(pickingObjMap, pickingobjMapMaterial);

        pickingScene.add(pickingPoints)
        canvas.addEventListener('click', (e) =>
        {
            renderer.setRenderTarget(pickingTexture)
            renderer.render(pickingScene, camera);
            renderer.setRenderTarget(null);

            var x = e.clientX * window.devicePixelRatio;
            var y = pickingTexture.height - e.clientY * window.devicePixelRatio;
            renderer.readRenderTargetPixels(pickingTexture, x, y, 1, 1, pixelBuffer);

            var id = (pixelBuffer[0] << 16) | (pixelBuffer[1] << 8) | (pixelBuffer[2]) - 1;

            if (id !== -1)
            {
                console.log('You picked ' + objectVertices.info[id].id + '!');
            }
        })

        setInterval(() =>
        {
            objMapMaterial.uniforms.asynctime.value += 0.005;
        }, 10);
    });
});


skyDomeMesh.add(camera);
skyDomeMesh.rotation.z = -(90-32.8407) * Math.PI / 180;
var origindate = new Date( 'January 1, 2000 05:19:16 GMT' )
var deltadays = (Date.now()-origindate.getTime())/86164090;
var rotationoffset = (deltadays*2*Math.PI + -83.634705*Math.PI/180) % (2*Math.PI);
console.log(rotationoffset);

skyDomeMesh.rotation.y = rotationoffset-Math.PI/2;
function animate()
{
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
    //skyDomeMesh.rotation.y += 0.001;
}
animate();
