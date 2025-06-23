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
                <small>${item.latitude}, ${item.longitude}</small>
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
        bootstrap.Modal.getInstance(document.getElementById(`editModal-${id}`)).hide();
        document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
        loadMarkers();
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
