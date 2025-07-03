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
let addMap, addMapMarker;

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
    setupAddMapModal();
});

// =====================
// Marker Loading & Rendering
// =====================
async function loadMarkers() {
    const searchInput = document.getElementById("searchInput").value.trim();
    const url = new URL("/Home/GetMapPointsJson", window.location.origin);
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
    const modalsContainer = document.getElementById("modalsContainer");
    tbody.innerHTML = "";
    modalsContainer.innerHTML = "";
    markers.forEach(m => m.setMap(null));
    markers = [];
    data.forEach((item, index) => {
        renderMarkerRow(item, index, tbody, modalsContainer);
        renderMarkerOnMap(item);
        setupEditMapModal(item);
    });
    setupTitleLinkEvents();
}

function renderMarkerRow(item, index, tbody, modalsContainer) {
    const no = (currentPage - 1) * pageSize + index + 1;
    const imageTag = item.imageUrl
        ? `<img src="${item.imageUrl}" class="img-thumbnail rounded shadow-sm" style="width:60px;height:60px;object-fit:cover;" />`
        : "";
    const modalId = `editModal-${item.id}`;
    const row = `
        <tr>
            <td>${no}</td>
            <td>${item.createdUserName ?? "-"}</td>
            <td><a href="#" class="title-link" data-index="${index}">${item.title}</a></td>
            <td>${item.latitude}, ${item.longitude}</td>
            <td>${imageTag}</td>
            <td>${item.description}</td>
            <td>
                <button class="btn btn-sm btn-primary" data-bs-toggle="modal" data-bs-target="#${modalId}">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteMarker(${item.id})">Hapus</button>
            </td>
        </tr>`;
    const modal = getEditModalHtml(item, modalId);
    tbody.insertAdjacentHTML("beforeend", row);
    modalsContainer.insertAdjacentHTML("beforeend", modal);
}

function getEditModalHtml(item, modalId) {
    return `
        <div class="modal fade" id="${modalId}" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog">
                <div class="modal-content">
                    <form onsubmit="submitEditForm(event, ${item.id})">
                        <div class="modal-header">
                            <h5 class="modal-title">Edit Marker</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="mb-3">
                                <label class="form-label">Judul</label>
                                <input type="text" class="form-control" id="edit-title-${item.id}" value="${item.title}" required />
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Deskripsi</label>
                                <textarea class="form-control" id="edit-desc-${item.id}" required>${item.description}</textarea>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Latitude</label>
                                <input type="text" class="form-control" id="edit-lat-${item.id}" value="${item.latitude}" required />
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Longitude</label>
                                <input type="text" class="form-control" id="edit-lng-${item.id}" value="${item.longitude}" required />
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Pilih Titik di Map</label>
                                <div class="edit-map" id="edit-map-${item.id}" style="height: 300px; width: 100%; border: 1px solid #ccc;"></div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Gambar (opsional)</label>
                                <input type="file" class="form-control" id="edit-image-${item.id}" accept="image/*" />
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="submit" class="btn btn-success">Simpan</button>
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Batal</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>`;
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
// Add Marker Modal Map
// =====================
function setupAddMapModal() {
    const addModal = document.getElementById('addModal');
    if (!addModal) return;
    addModal.addEventListener('shown.bs.modal', function () {
        if (!addMap) {
            addMap = new google.maps.Map(document.getElementById('add-map'), {
                center: DEFAULT_CENTER,
                zoom: 12
            });
            addMapMarker = new google.maps.Marker({
                position: DEFAULT_CENTER,
                map: addMap,
                draggable: true
            });
            setAddLatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
            addMap.addListener('click', function (e) {
                setAddLatLng(e.latLng.lat(), e.latLng.lng());
                addMapMarker.setPosition({ lat: e.latLng.lat(), lng: e.latLng.lng() });
            });
            addMapMarker.addListener('dragend', function (e) {
                setAddLatLng(e.latLng.lat(), e.latLng.lng());
            });
        } else {
            google.maps.event.trigger(addMap, 'resize');
            addMap.setCenter(addMapMarker.getPosition());
        }
    });
    addModal.addEventListener('hidden.bs.modal', function () {
        if (addMap && addMapMarker) {
            addMap.setCenter(DEFAULT_CENTER);
            addMapMarker.setPosition(DEFAULT_CENTER);
            setAddLatLng(DEFAULT_CENTER.lat, DEFAULT_CENTER.lng);
        }
    });
}
function setAddLatLng(lat, lng) {
    document.getElementById('add-lat').value = lat;
    document.getElementById('add-lng').value = lng;
}

// =====================
// Edit Marker Modal Map
// =====================
function setupEditMapModal(item) {
    const modalId = `editModal-${item.id}`;
    setTimeout(() => {
        const editModal = document.getElementById(modalId);
        if (!editModal) return;
        editModal.addEventListener('shown.bs.modal', function () {
            const mapDiv = document.getElementById(`edit-map-${item.id}`);
            if (!mapDiv) return;
            if (!mapDiv._google_map_instance) {
                const lat = parseFloat(item.latitude);
                const lng = parseFloat(item.longitude);
                const editMap = new google.maps.Map(mapDiv, {
                    center: { lat, lng },
                    zoom: 14
                });
                const editMarker = new google.maps.Marker({
                    position: { lat, lng },
                    map: editMap,
                    draggable: true
                });
                mapDiv._google_map_instance = editMap;
                mapDiv._google_map_marker = editMarker;
                editMap.addListener('click', function (e) {
                    setEditLatLng(item.id, e.latLng.lat(), e.latLng.lng());
                    editMarker.setPosition({ lat: e.latLng.lat(), lng: e.latLng.lng() });
                });
                editMarker.addListener('dragend', function (e) {
                    setEditLatLng(item.id, e.latLng.lat(), e.latLng.lng());
                });
            } else {
                const editMap = mapDiv._google_map_instance;
                const editMarker = mapDiv._google_map_marker;
                google.maps.event.trigger(editMap, 'resize');
                editMap.setCenter(editMarker.getPosition());
            }
        });
        editModal.addEventListener('hidden.bs.modal', function () {
            const mapDiv = document.getElementById(`edit-map-${item.id}`);
            if (mapDiv && mapDiv._google_map_instance && mapDiv._google_map_marker) {
                const lat = parseFloat(item.latitude);
                const lng = parseFloat(item.longitude);
                mapDiv._google_map_instance.setCenter({ lat, lng });
                mapDiv._google_map_marker.setPosition({ lat, lng });
                setEditLatLng(item.id, lat, lng);
            }
        });
    }, 0);
}
function setEditLatLng(id, lat, lng) {
    document.getElementById(`edit-lat-${id}`).value = lat;
    document.getElementById(`edit-lng-${id}`).value = lng;
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
    document.querySelector(".pagination-container").innerHTML = html;
}
function goToPage(page) {
    currentPage = page;
    loadMarkers();
}

// =====================
// CRUD Handlers
// =====================
async function submitAddForm(e) {
    e.preventDefault();
    const formData = new FormData();
    formData.append("Title", document.getElementById("add-title").value);
    formData.append("Description", document.getElementById("add-desc").value);
    formData.append("Latitude", document.getElementById("add-lat").value);
    formData.append("Longitude", document.getElementById("add-lng").value);
    const image = document.getElementById("add-image").files[0];
    if (image) formData.append("Image", image);
    const response = await fetch("/Home/CreateMapPoint", {
        method: "POST",
        body: formData,
        credentials: "include"
    });
    if (response.ok) {
        alert("Marker berhasil ditambahkan.");
        location.reload();
    } else {
        alert("Gagal menambahkan marker.");
    }
}

async function submitEditForm(e, id) {
    e.preventDefault();
    const formData = new FormData();
    formData.append("Title", document.getElementById(`edit-title-${id}`).value);
    formData.append("Description", document.getElementById(`edit-desc-${id}`).value);
    formData.append("Latitude", document.getElementById(`edit-lat-${id}`).value);
    formData.append("Longitude", document.getElementById(`edit-lng-${id}`).value);
    const image = document.getElementById(`edit-image-${id}`).files[0];
    if (image) formData.append("Image", image);
    const response = await fetch(`/Home/EditMapPoint?id=${id}`, {
        method: "POST",
        body: formData,
        credentials: "include"
    });
    if (response.ok) {
        alert("Marker berhasil diperbarui.");
        const modalElement = document.getElementById(`editModal-${id}`);
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) modalInstance.hide();
        setTimeout(() => {
            document.querySelectorAll(".modal-backdrop").forEach(el => el.remove());
            document.body.classList.remove("modal-open");
            document.documentElement.style.overflow = "auto";
            document.body.style.overflow = "auto";
            document.body.style.paddingRight = "0";
            loadMarkers();
        }, 300);
    } else {
        alert("Gagal memperbarui marker.");
    }
}

async function deleteMarker(id) {
    if (!confirm("Yakin ingin menghapus marker ini?")) return;
    const response = await fetch(`/Home/DeleteMapPoint?id=${id}`, {
        method: "POST",
        credentials: "include"
    });
    if (response.ok) {
        alert("Berhasil menghapus marker.");
        loadMarkers();
    } else {
        alert("Gagal menghapus marker.");
    }
}
