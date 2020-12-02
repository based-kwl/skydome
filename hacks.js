THREE.OrbitControlsLocal = function (realObject, domElement) {
    this.realObject = realObject;
    //Camera and Object3D have different forward direction:
    let placeholderObject = realObject.isCamera ? new THREE.PerspectiveCamera() : new THREE.Object3D;
    this.placeholderObject = placeholderObject;

    THREE.OrbitControls.call(this, placeholderObject, domElement);

    let globalUpdate = this.update;
    this.globalUpdate = globalUpdate;
    this.update = function () {

        //This responds to changes made to realObject from outside the controls:
        placeholderObject.position.copy(realObject.position);
        placeholderObject.quaternion.copy(realObject.quaternion);
        placeholderObject.scale.copy(realObject.scale);
        placeholderObject.up.copy(realObject.up);

        var retval = globalUpdate();
        realObject.position.copy(placeholderObject.position);
        realObject.quaternion.copy(placeholderObject.quaternion);
        realObject.scale.copy(placeholderObject.scale);
        return retval;

    };

    this.update();
};

THREE.OrbitControlsLocal.prototype = Object.create(THREE.OrbitControls.prototype);
THREE.OrbitControlsLocal.prototype.constructor = THREE.OrbitControlsLocal;

Object.defineProperties(THREE.OrbitControlsLocal.prototype, {
    localTarget: {
        get: () => this.target,
        set: v => this.target = v
    }
});

async function smoothtarget(target) {
    var vector = new THREE.Vector3(0, 0, -1)
    vector.applyQuaternion(camera.quaternion);
    vector.x = vector.x * 1000;
    vector.y = vector.y * 1000;
    vector.z = vector.z * 1000;
    var distance = Math.sqrt(Math.pow((target.x - vector.x), 2) + Math.pow((target.y - vector.y), 2) + Math.pow((target.z - vector.z), 2))
    var distancex = Math.abs(target.x - vector.x);
    var distancey = Math.abs(target.y - vector.y);
    var distancez = Math.abs(target.z - vector.z);
    var stepx = distancex * 0.005;
    var stepy = distancey * 0.005;
    var stepz = distancez * 0.005;
    var totalstepx = 0;
    var totalstepy = 0;
    var totalstepz = 0;
    var distancedone = 0;
    while (vector.x != target.x || vector.y != target.y || vector.z != target.z) {
        if (vector.x < target.x) {
            if (vector.x + stepx > target.x) {
                vector.x = target.x;
            } else {
                vector.x = vector.x + stepx;
            }
        }
        if (vector.x > target.x) {
            if (vector.x - stepx < target.x) {
                vector.x = target.x;
            } else {
                vector.x = vector.x - stepx;
            }

        }
        if (vector.y < target.y) {
            if (vector.y + stepy > target.y) {
                vector.y = target.y;
            } else {
                vector.y = vector.y + stepy;
            }
        }
        if (vector.y > target.y) {
            if (vector.y - stepy < target.y) {
                vector.y = target.y;
            } else {
                vector.y = vector.y - stepy;
            }
        }
        if (vector.z < target.z) {
            if (vector.z + stepz > target.z) {
                vector.z = target.z;
            } else {
                vector.z = vector.z + stepz;
            }
        }
        if (vector.z > target.z) {
            if (vector.z - stepz < target.z) {
                vector.z = target.z;
            } else {
                vector.z = vector.z - stepz;
            }
        }
        totalstepx = totalstepx + stepx;
        totalstepy = totalstepy + stepy;
        totalstepz = totalstepz + stepz;
        distancedone = Math.sqrt(Math.pow(totalstepx, 2) + Math.pow(totalstepy, 2) + Math.pow(totalstepz, 2));
        if (distancedone < distance / 2) {
            stepx = stepx * 1.005;
        } else {
            stepx = stepx / 1.005;
            if (stepx < 0.01) {
                stepx = 0.01;
            }
        }

        camera.position.set(-vector.x, -vector.y, -vector.z);
        controls.update();
        await sleep(1);
    }
    return;

}

async function yeet(e, name) {
    while (tracking == name) {
        var vec = new THREE.Vector3(e.x, e.y, e.z);
        skyDomeMesh.worldToLocal(vec);
        camera.position.set(-vec.x, -vec.y, -vec.z);
        controls.update();
        await sleep(1);
    }
}