let lat = 999;
let long = 999;
let coordInfo = '';
let strCoord = null;

function convertToMinutes(decimal) {
    return Math.floor(decimal * 60);
}

function convertToSeconds(decimal) {
    return (decimal * 3600 % 60).toFixed(1);
}

function getLatDirection(lat) {
    return lat >= 0 ? "N" : "S";
}

function getLongDirection(long) {
    return long >= 0 ? "E" : "W";
}

(function (xhr) {

    var XHR = XMLHttpRequest.prototype;

    var open = XHR.open;
    var send = XHR.send;

    XHR.open = function (method, url) {
        this._method = method;
        this._url = url;
        return open.apply(this, arguments);
    };

    XHR.send = function (postData) {
        this.addEventListener('load', function () {
            try {
                window.postMessage({ type: 'xhr', data: this.response }, '*');
            } catch {
                return;
            }
        });
        return send.apply(this, arguments);
    };
})(XMLHttpRequest);



const { fetch: origFetch } = window;
window.fetch = async (...args) => {
    const response = await origFetch(...args);
    const clonedResponse = await response.clone().blob();
    window.postMessage({ type: 'fetch', data: clonedResponse }, '*');
    return response;
};

window.addEventListener('message', async function (e) {
    const msg = e.data.data;
    if (msg) {
        try {
            const arr = JSON.parse(msg);
            let x = false;
            try {
                lat = arr[1][0][5][0][1][0][2];
                long = arr[1][0][5][0][1][0][3];
                x = true;
            } catch (e) {
                // useless to output
            }

            if (!x) {
                try {
                    if (isDecimal(arr[1][5][0][1][0][2]) && isDecimal(arr[1][5][0][1][0][3])) {
                        lat = arr[1][5][0][1][0][2];
                        long = arr[1][5][0][1][0][3];
                    }
                } catch (e) {
                    // useless to output
                }
            }

            strCoord = null;
        } catch {
            return;
        }
    }
});

function isDecimal(str) {
    str = String(str);
    return !isNaN(str) && str.includes('.') && !isNaN(parseFloat(str));
}

function convertCoords(lat, long) {
    var latResult, longResult, dmsResult;
    latResult = Math.abs(lat);
    longResult = Math.abs(long);
    dmsResult = Math.floor(latResult) + "°" + convertToMinutes(latResult % 1) + "'" + convertToSeconds(latResult % 1) + '"' + getLatDirection(lat);
    dmsResult += "+" + Math.floor(longResult) + "°" + convertToMinutes(longResult % 1) + "'" + convertToSeconds(longResult % 1) + '"' + getLongDirection(long);
    return dmsResult;
}

async function getCoordInfo() {
    if (strCoord !== null) {
        return strCoord;
    }

    try {
        const response = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${long}&format=json`);

        if (!response.ok) {
            return;
        }

        const data = await response.json();
        return data.address;
    } catch {
        return;
    }
}

function stringToBool(str) {
    if (str === 'true') return true;
    if (str === 'false') return false;
    return null;
}


window.addEventListener('load', async function () {

    let safeMode = this.localStorage.getItem('safeMode')
    if (safeMode == null) {
        localStorage.setItem('safeMode', false)
        safeMode = true
    }

    document.addEventListener('keydown', function (event) {
        if (event.key === '/') {
            event.preventDefault(); // Mencegah aksi default browser
            autoPlace(true); // Panggil fungsi autoPlace dengan safeMode
        }
    });

    document.addEventListener('keydown', function (event) {
        if (event.ctrlKey && event.key === ']') {
            event.preventDefault(); // Mencegah aksi default browser
            autoPlace(false); // Panggil fungsi autoPlace dengan safeMode
        }
    });

    let touchStartTime = 0;
    let touchDuration = 1000; // 5 detik

    // Ketika layar mulai disentuh
    document.addEventListener('touchstart', function() {
        touchStartTime = Date.now(); // Menyimpan waktu saat sentuhan dimulai
    });

    // Ketika sentuhan pada layar dilepas
    document.addEventListener('touchend', function() {
        let touchEndTime = Date.now(); // Menyimpan waktu saat sentuhan berakhir
        let elapsedTime = touchEndTime - touchStartTime; // Menghitung durasi sentuhan

        if (elapsedTime >= touchDuration) {
            autoPlace(true);
        } 
    });

});

function getRandomOffset(lat, long) {
    // Radius Bumi dalam kilometer
    const earthRadius = 6371;

    // Rentang jarak yang diinginkan dalam kilometer
    const minDistance = 100;
    const maxDistance = 150;

    // Menghasilkan jarak acak dalam rentang yang diinginkan
    const randomDistance = minDistance + Math.random() * (maxDistance - minDistance);

    // Menghasilkan sudut acak dalam radian
    const angle = Math.random() * 2 * Math.PI;

    // Menghitung offset dalam derajat
    const latOffset = randomDistance / earthRadius * Math.cos(angle);
    const longOffset = randomDistance / earthRadius * Math.sin(angle) / Math.cos(lat * Math.PI / 180);

    // Menghasilkan koordinat baru
    const newLat = lat + latOffset * (180 / Math.PI);
    const newLong = long + longOffset * (180 / Math.PI);

    return { newLat, newLong };
}

async function autoPlace(safeMode) {
    const element = document.querySelector('.guess-map_canvasContainer__s7oJp');

    if (element) {
        const keys = Object.keys(element);
        const key = keys.find(key => key.startsWith("__reactFiber$"));
        let latPin = lat;
        let longPin = long;

        if (key) {
            const place = element[key].return.memoizedProps.onMarkerLocationChanged;
            if (safeMode) {
                const addOffset = getRandomOffset(lat, long);
                latPin = addOffset.newLat;
                longPin = addOffset.newLong;
            }

            place({ lat: latPin, lng: longPin });
        }
    }
}

