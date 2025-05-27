import { initializeApp } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, updateDoc, deleteDoc, doc, getDoc, query, where
} from "https://www.gstatic.com/firebasejs/11.5.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCJHO29B3YY9-7_q6MyTUxj-UsStQkbdqI",
  authDomain: "terminalassessment3.firebaseapp.com",
  projectId: "terminalassessment3",
  //storageBucket: "terminalassessment3.firebasestorage.app",
  storageBucket: "terminalassessment3.appspot.com",
  messagingSenderId: "936918276454",
  appId: "1:936918276454:web:062eac408467ba578050a7"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const client_id = "6e73abf3ff9343bdb67d64f3af176bca";
const redirect_uri = "https://3adc-2001-4451-9a3-9c00-c60-e16a-bb86-691d.ngrok-free.app/callback.html"; // Change this

window.login = login;
window.search = search;
window.addToFavorites = addToFavorites;
window.playTrack = playTrack;
window.pauseTrack = pauseTrack;
window.deleteTrack = deleteTrack;

function login() {
    const scopes = "streaming user-read-email user-read-private";
    const url = `https://accounts.spotify.com/authorize?client_id=${client_id}&response_type=code&redirect_uri=${encodeURIComponent(redirect_uri)}&scope=${encodeURIComponent(scopes)}`;
    window.location.href = url;
}

let currentTrackUri = null;
let isPlaying = false;
let player;

async function search() {
    const token = localStorage.getItem("access_token");
    const queryText = document.getElementById("query").value.trim();
    if (!queryText) return;

    const res = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(queryText)}&type=track,artist&limit=5`, {
        headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();

    // Create floating container if not already there
    let floatingWindow = document.getElementById("floatingResults");
    if (!floatingWindow) {
        floatingWindow = document.createElement("div");
        floatingWindow.id = "floatingResults";
        floatingWindow.classList.add("floating-window");
        document.body.prepend(floatingWindow);
    }

    // Set window content
    floatingWindow.innerHTML = `
        <div class="floating-header">
            <span>Search Results for "<strong>${queryText}</strong>"</span>
            <button onclick="document.getElementById('floatingResults').remove()">✖</button>
        </div>
        <div class="floating-content"></div>
    `;

    const contentDiv = floatingWindow.querySelector(".floating-content");

    data.tracks.items.forEach(track => {
        const div = document.createElement("div");
        div.className = "floating-track";
        div.innerHTML = `
            <img src="${track.album.images[0].url}" alt="Album cover" width="80">
            <section class="track-section">
                <p class="song-info"><strong>${track.name}</strong> by ${track.artists[0].name}</p>
                <button class="favorite-btn" onclick='addToFavorites(${JSON.stringify(track)})'>Add to Favorites</button>
            </section>
        `;
        contentDiv.appendChild(div);
    });
}


async function addToFavorites(track) {
    const songList = document.getElementById("songList");

    // Check for duplicates
    const favsRef = collection(db, "favorites");
    const q = query(favsRef, where("uri", "==", track.uri));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
        await Swal.fire({
            icon: 'info',
            title: 'Already Added',
            text: 'This song is already in your favorites.',
            timer: 1500,
            showConfirmButton: false
        });
        return;
    }

    // Add to Firestore
    const docRef = await addDoc(favsRef, {
        name: track.name,
        artist: track.artists[0].name,
        uri: track.uri,
        albumImage: track.album.images[0].url
    });

    renderSongCard({
        id: docRef.id,
        ...track
    });

    await Swal.fire({
        icon: 'success',
        title: 'Song Added!',
        text: 'The song has been successfully added to your collection.',
        timer: 1500,
        showConfirmButton: false
    });
}

async function playTrack(trackUri) {
    const token = localStorage.getItem("access_token");
    const deviceId = localStorage.getItem("device_id");

    if (trackUri === currentTrackUri) {
        if (isPlaying) {
            await player.pause();
            isPlaying = false;
        } else {
            await player.resume();
            isPlaying = true;
        }
        return;
    }

    currentTrackUri = trackUri;
    isPlaying = true;

    await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${deviceId}`, {
    method: 'PUT',
    body: JSON.stringify({ uris: [trackUri] }),
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    }
    });
}

async function deleteTrack(button) {
    const card = button.closest(".song-card");
    const docId = card.getAttribute("data-id");

    try {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: "You won't be able to revert this!",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#fc5974',
            cancelButtonColor: '#d33',
            confirmButtonText: 'Yes, delete it!'
        });

        if (result.isConfirmed && docId) {
            await deleteDoc(doc(db, "favorites", docId));
            card.remove();

            await Swal.fire({
                icon: 'success',
                title: 'Deleted!',
                text: 'Your song has been deleted.',
                timer: 1500,
                showConfirmButton: false
            });
        }
    } catch (error) {
        console.error("Error deleting document: ", error);
        await Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to delete the song. Please try again.'
        });
    }
}


function pauseTrack() {
    if (player) player.pause();
}

function renderSongCard(track) {
    const songList = document.getElementById("songList");

    const card = document.createElement("div");
    card.className = "song-card";
    card.setAttribute("data-id", track.id || "");

    card.innerHTML = `
        <img src="${track.albumImage || track.album.images[0].url}" alt="Album cover" width="250">
        <h3 class="scroll-title">${track.name}</h3>
        <p>Artist: ${track.artist || track.artists[0].name}</p>
        <section class="card-buttons">
            <button class="play-btn" onclick="playTrack('${track.uri}')"><span class="material-icons">play_arrow</span></button>
            <button class="pause-btn" onclick="pauseTrack()"><span class="material-icons">pause</span></button>
             <button class="replay-btn" onclick="replayTrack('${track.uri}')"><span class="material-icons">replay</span></button>
            <button class="delete-btn" onclick="deleteTrack(this)"><span class="material-icons">delete</span></button>
        </section>
        <div class="progress-container">
            <input type="range" class="progress-bar" value="0" max="100" step="1" data-uri="${track.uri}">
        </div>


    `;

    songList.appendChild(card);
}

window.onload = async () => {
    const snapshot = await getDocs(collection(db, "favorites"));
    snapshot.forEach(docSnap => {
        const track = docSnap.data();
        renderSongCard({
            id: docSnap.id,
            ...track
        });
    });
};

window.replayTrack = async (uri) => {
    const token = localStorage.getItem("access_token");

    const response = await fetch(`https://api.spotify.com/v1/me/player/play`, {
        method: "PUT",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            uris: [uri],
            position_ms: 0
        })
    });

    if (response.ok) {
        console.log("Track replayed.");
    } else {
        console.error("Replay failed:", await response.json());
        Swal.fire("Error", "Could not replay track. Make sure a Spotify device is active.", "error");
    }
};


window.onSpotifyWebPlaybackSDKReady = () => {
    const token = localStorage.getItem('access_token');
    player = new Spotify.Player({
        name: 'Web Playback SDK Player',
        getOAuthToken: cb => { cb(token); },
        volume: 0.5
    });

    player.addListener('initialization_error', ({ message }) => { console.error(message); });
    player.addListener('authentication_error', ({ message }) => { console.error(message); });
    player.addListener('account_error', ({ message }) => { console.error(message); });
    player.addListener('playback_error', ({ message }) => { console.error(message); });

    player.addListener('ready', ({ device_id }) => {
        console.log('Ready with Device ID', device_id);
        localStorage.setItem('device_id', device_id);
    });

    player.addListener('player_state_changed', state => {
        if (!state) return;

        const position = state.position;
        const duration = state.duration;

        currentTrackUri = state.track_window?.current_track?.uri || null;
        isPlaying = !state.paused;

        const progressPercent = (position / duration) * 100;
        const progressBars = document.querySelectorAll(`.progress-bar[data-uri="${currentTrackUri}"]`);
        progressBars.forEach(bar => {
            bar.value = progressPercent;
        });
    });

    setInterval(async () => {
        const state = await player.getCurrentState();
        if (!state || state.paused) return;

        const position = state.position;
        const duration = state.duration;
        const progressPercent = (position / duration) * 100;

        const progressBars = document.querySelectorAll(`.progress-bar[data-uri="${currentTrackUri}"]`);
        progressBars.forEach(bar => {
            bar.value = progressPercent;
        });
    }, 1000);

    player.connect();
};