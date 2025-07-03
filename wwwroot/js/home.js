// =====================
// Utilities
// =====================
function formatDateTime(dateString) {
    const date = new Date(dateString);
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

const DEFAULT_CENTER = { lat: -6.914744, lng: 107.60981 };
let map, markers = [], currentPage = 1, pageSize = 10;

// =====================
// Map Initialization
// =====================
function initMap() {
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 10,
        center: DEFAULT_CENTER,
    });
    loadMarkers();
}

// =====================
// DOM Event Bindings
// =====================
document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("entriesSelect").addEventListener("change", function () {
        pageSize = parseInt(this.value);
        currentPage = 1;
        loadMarkers();
    });
    document.getElementById("btnSearch").addEventListener("click", function () {
        currentPage = 1;
        loadMarkers();
    });
});

// =====================
// Marker Loading & Rendering
// =====================
async function loadMarkers() {
    const searchInput = document.getElementById("searchInput").value.trim();
    const url = new URL("/api/MapPoints", window.location.origin);
    if (searchInput !== "") {
        if (!isNaN(searchInput)) url.searchParams.append("id", searchInput);
        else url.searchParams.append("search", searchInput);
    }
    url.searchParams.append("page", currentPage);
    url.searchParams.append("pageSize", pageSize);
    const response = await fetch(url, { credentials: "include" });
    const result = await response.json();
    renderMarkers(result.data);
    renderPagination(result.currentPage, result.totalPages);
}

function renderMarkers(data) {
    const tbody = document.querySelector("#markerTable tbody");
    tbody.innerHTML = "";
    markers.forEach(m => m.setMap(null));
    markers = [];
    data.forEach((item, index) => {
        renderMarkerRow(item, index, tbody);
        renderMarkerOnMap(item);
    });
    setupTitleLinkEvents();
}

function renderMarkerRow(item, index, tbody) {
    const no = (currentPage - 1) * pageSize + index + 1;
    const imageTag = item.imageUrl
        ? `<img src="${item.imageUrl}" class="img-thumbnail rounded shadow-sm" style="width:60px;height:60px;object-fit:cover;" />`
        : "";
    const row = `
        <tr>
            <td>${no}</td>
            <td>${item.createdUserName ?? "-"}</td>
            <td><a href="#" class="title-link" data-index="${index}">${item.title}</a></td>
            <td>${item.latitude}, ${item.longitude}</td>
            <td>${imageTag}</td>
            <td>${item.description}</td>
        </tr>`;
    tbody.insertAdjacentHTML("beforeend", row);
}

function renderMarkerOnMap(item) {
    const position = {
        lat: parseFloat(item.latitude),
        lng: parseFloat(item.longitude)
    };
    const formattedDate = formatDateTime(item.createdAt);
    const marker = new google.maps.Marker({
        position,
        map,
        title: item.title,
        icon: {
            url: "/img/marker.png",
            scaledSize: new google.maps.Size(32, 32)
        }
    });
    const infoWindow = new google.maps.InfoWindow({
        content: `<div style="min-width:200px;">
            ${item.imageUrl ? `<img src="${item.imageUrl}" style="width:100%;max-height:150px;object-fit:cover;border-radius:8px;margin-bottom:5px;" />` : ""}
            <strong>${item.title}</strong><br/>
            ${item.description}<br/>
            <small>${item.latitude}, ${item.longitude}</small>,<br/>
            <small>${formattedDate}</small>
        </div>`
    });
    marker.addListener("click", () => infoWindow.open(map, marker));
    markers.push(marker);
}

function setupTitleLinkEvents() {
    document.querySelectorAll(".title-link").forEach(link => {
        link.addEventListener("click", function (e) {
            e.preventDefault();
            const index = parseInt(this.dataset.index);
            const marker = markers[index];
            if (marker) {
                map.panTo(marker.getPosition());
                map.setZoom(14);
                google.maps.event.trigger(marker, "click");
            }
        });
    });
}

// =====================
// Pagination
// =====================
function renderPagination(current, total) {
    let html = `<nav aria-label="Page navigation"><ul class="pagination justify-content-center">`;
    html += `<li class="page-item ${current <= 1 ? "disabled" : ""}">
                <button class="page-link" onclick="goToPage(${current - 1})">Previous</button>
             </li>`;
    for (let i = 1; i <= total; i++) {
        html += `<li class="page-item ${i === current ? "active" : ""}">
                    <button class="page-link" onclick="goToPage(${i})">${i}</button>
                 </li>`;
    }
    html += `<li class="page-item ${current >= total ? "disabled" : ""}">
                <button class="page-link" onclick="goToPage(${current + 1})">Next</button>
             </li>`;
    html += `</ul></nav>`;
    const container = document.querySelector(".pagination-container");
    if (container) container.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    loadMarkers();
}
