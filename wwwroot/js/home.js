let markers = [];
let map;

function initMap() {
    var center = { lat: -6.914744, lng: 107.60981 };
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 10,
        center: center,
    });
    loadMarkers();
}

let currentPage = 1;
let pageSize = 10;

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

async function loadMarkers() {
    const searchInput = document.getElementById("searchInput").value.trim();
    const url = new URL("/api/MapPoints", window.location.origin);

    if (searchInput !== "") {
        if (!isNaN(searchInput)) {
            url.searchParams.append("id", searchInput);
        } else {
            url.searchParams.append("search", searchInput);
        }
    }

    url.searchParams.append("page", currentPage);
    url.searchParams.append("pageSize", pageSize);

    const response = await fetch(url, { credentials: "include" });
    const result = await response.json();

    renderMarkers(result.data);
    renderPagination(result.currentPage, result.totalPages);
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    const pad = n => String(n).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function renderMarkers(data) {
    const tbody = document.querySelector("#markerTable tbody");
    const modalsContainer = document.getElementById("modalsContainer");
    tbody.innerHTML = "";
    modalsContainer.innerHTML = "";

    markers.forEach(m => m.setMap(null));
    markers = [];

    data.forEach((item, index) => {
        const no = (currentPage - 1) * pageSize + index + 1;
        const imageTag = item.imageUrl
            ? `<img src="${item.imageUrl}" class="img-thumbnail rounded shadow-sm" style="width:60px;height:60px;object-fit:cover;" />`
            : "";
        const formattedDate = formatDateTime(item.createdAt);

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

        const position = {
            lat: parseFloat(item.latitude),
            lng: parseFloat(item.longitude)
        };

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
    });

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

function renderPagination(current, total) {
    let html = `<nav aria-label="Page navigation">`;
    html += `<ul class="pagination justify-content-center">`;

    if (current > 1) {
        html += `<li class="page-item">
                <button class="page-link" onclick="goToPage(${current - 1})">Previous</button>
             </li>`;
    } else {
        html += `<li class="page-item disabled">
                <span class="page-link">Previous</span>
             </li>`;
    }

    for (let i = 1; i <= total; i++) {
        if (i === current) {
            html += `<li class="page-item active" aria-current="page">
                    <span class="page-link">${i}</span>
                 </li>`;
        } else {
            html += `<li class="page-item">
                    <button class="page-link" onclick="goToPage(${i})">${i}</button>
                 </li>`;
        }
    }

    if (current < total) {
        html += `<li class="page-item">
                <button class="page-link" onclick="goToPage(${current + 1})">Next</button>
             </li>`;
    } else {
        html += `<li class="page-item disabled">
                <span class="page-link">Next</span>
             </li>`;
    }

    html += `</ul></nav>`;

    const container = document.querySelector(".pagination-container");
    if (container) container.innerHTML = html;
}

function goToPage(page) {
    currentPage = page;
    loadMarkers();
}
