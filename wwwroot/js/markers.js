let markers = [];
let map;
let currentPage = 1;
let pageSize = 10;

function initMap() {
    const center = { lat: -6.914744, lng: 107.60981 };
    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 10,
        center: center,
    });
    loadMarkers();
}

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
    const url = new URL("/Home/GetMapPointsJson", window.location.origin);

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

function renderMarkers(data) {
    const tbody = document.querySelector("#markerTable tbody");
    const modalsContainer = document.getElementById("modalsContainer");
    tbody.innerHTML = "";
    modalsContainer.innerHTML = "";

    // Hapus marker lama dari map
    markers.forEach(m => m.setMap(null));
    markers = [];

    data.forEach((item, index) => {
        const no = (currentPage - 1) * pageSize + index + 1;
        const imageTag = item.imageUrl
            ? `<img src="${item.imageUrl}" class="img-thumbnail rounded shadow-sm" style="width:60px;height:60px;object-fit:cover;" />`
            : "";
        const modalId = `editModal-${item.id}`;

        // Baris tabel dengan judul yang bisa diklik
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

        // Modal edit
        const modal = `
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

        tbody.insertAdjacentHTML("beforeend", row);
        modalsContainer.insertAdjacentHTML("beforeend", modal);

        // Inisialisasi map pada modal edit saat modal ditampilkan
        setTimeout(() => {
            const editModal = document.getElementById(modalId);
            if (editModal) {
                editModal.addEventListener('shown.bs.modal', function () {
                    const mapDiv = document.getElementById(`edit-map-${item.id}`);
                    if (!mapDiv) return;
                    // Cek jika sudah ada map instance di div ini
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
                        // Set marker dan map ke div agar tidak double inisialisasi
                        mapDiv._google_map_instance = editMap;
                        mapDiv._google_map_marker = editMarker;
                        // Event klik pada map
                        editMap.addListener('click', function (e) {
                            const lat = e.latLng.lat();
                            const lng = e.latLng.lng();
                            document.getElementById(`edit-lat-${item.id}`).value = lat;
                            document.getElementById(`edit-lng-${item.id}`).value = lng;
                            editMarker.setPosition({ lat, lng });
                        });
                        // Event drag marker
                        editMarker.addListener('dragend', function (e) {
                            const lat = e.latLng.lat();
                            const lng = e.latLng.lng();
                            document.getElementById(`edit-lat-${item.id}`).value = lat;
                            document.getElementById(`edit-lng-${item.id}`).value = lng;
                        });
                    } else {
                        // Jika sudah ada, resize dan set center ke marker
                        const editMap = mapDiv._google_map_instance;
                        const editMarker = mapDiv._google_map_marker;
                        google.maps.event.trigger(editMap, 'resize');
                        editMap.setCenter(editMarker.getPosition());
                    }
                });
                // Reset marker ke posisi awal saat modal ditutup
                editModal.addEventListener('hidden.bs.modal', function () {
                    const mapDiv = document.getElementById(`edit-map-${item.id}`);
                    if (mapDiv && mapDiv._google_map_instance && mapDiv._google_map_marker) {
                        const lat = parseFloat(item.latitude);
                        const lng = parseFloat(item.longitude);
                        mapDiv._google_map_instance.setCenter({ lat, lng });
                        mapDiv._google_map_marker.setPosition({ lat, lng });
                        document.getElementById(`edit-lat-${item.id}`).value = lat;
                        document.getElementById(`edit-lng-${item.id}`).value = lng;
                    }
                });
            }
        }, 0);

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
                <small>${item.createdAt}</small>
            </div>`
        });

        marker.addListener("click", () => infoWindow.open(map, marker));

        // Simpan marker dan InfoWindow dalam array marker
        markers.push(marker);
    });

    // Tambahkan event listener ke semua judul setelah semua marker dibuat
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

        // Tutup modal dengan aman
        const modalElement = document.getElementById(`editModal-${id}`);
        const modalInstance = bootstrap.Modal.getInstance(modalElement);
        if (modalInstance) modalInstance.hide();

        // Tunggu sejenak agar modal benar-benar hilang
        setTimeout(() => {
            // Hapus backdrop
            document.querySelectorAll(".modal-backdrop").forEach(el => el.remove());

            // Bersihkan class dan style body/html
            document.body.classList.remove("modal-open");
            document.documentElement.style.overflow = "auto";
            document.body.style.overflow = "auto";
            document.body.style.paddingRight = "0"; // kadang bootstrap menambahkan padding saat modal tampil

            // Load ulang data
            loadMarkers();
        }, 300); // waktu aman setelah animasi modal selesai
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

// --- Map for Add Modal ---
let addMap;
let addMapMarker;

// Inisialisasi map saat modal tambah marker ditampilkan
const addModal = document.getElementById('addModal');
if (addModal) {
    addModal.addEventListener('shown.bs.modal', function () {
        // Hanya inisialisasi sekali
        if (!addMap) {
            const defaultLat = -6.914744;
            const defaultLng = 107.60981;
            addMap = new google.maps.Map(document.getElementById('add-map'), {
                center: { lat: defaultLat, lng: defaultLng },
                zoom: 12
            });
            addMapMarker = new google.maps.Marker({
                position: { lat: defaultLat, lng: defaultLng },
                map: addMap,
                draggable: true
            });
            // Set input awal
            document.getElementById('add-lat').value = defaultLat;
            document.getElementById('add-lng').value = defaultLng;

            // Event klik pada map
            addMap.addListener('click', function (e) {
                const lat = e.latLng.lat();
                const lng = e.latLng.lng();
                document.getElementById('add-lat').value = lat;
                document.getElementById('add-lng').value = lng;
                addMapMarker.setPosition({ lat, lng });
            });
            // Event drag marker
            addMapMarker.addListener('dragend', function (e) {
                const lat = e.latLng.lat();
                const lng = e.latLng.lng();
                document.getElementById('add-lat').value = lat;
                document.getElementById('add-lng').value = lng;
            });
        } else {
            google.maps.event.trigger(addMap, 'resize');
            addMap.setCenter(addMapMarker.getPosition());
        }
    });
    // Reset marker ke default saat modal ditutup
    addModal.addEventListener('hidden.bs.modal', function () {
        if (addMap && addMapMarker) {
            const defaultLat = -6.914744;
            const defaultLng = 107.60981;
            addMap.setCenter({ lat: defaultLat, lng: defaultLng });
            addMapMarker.setPosition({ lat: defaultLat, lng: defaultLng });
            document.getElementById('add-lat').value = defaultLat;
            document.getElementById('add-lng').value = defaultLng;
        }
    });
}
