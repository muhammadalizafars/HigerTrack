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

    function renderMarkers(data) {
        const tbody = document.querySelector("#markerTable tbody");
        const modalsContainer = document.getElementById("modalsContainer");
        tbody.innerHTML = "";
        modalsContainer.innerHTML = "";

        markers.forEach(m => m.setMap(null));
        markers = [];

        data.forEach((item, index) => {
            const no = (currentPage - 1) * pageSize + index + 1;
            const imageTag = item.imageUrl ? `<img src="${item.imageUrl}" style="max-width:60px;max-height:60px;" />` : "";
            const modalId = `editModal-${item.id}`;

            const row = `
                <tr>
                    <td>${no}</td>
                    <td>${item.createdUserName ?? "-"}</td>
                    <td>${item.title}</td>
                    <td>${item.latitude} , ${item.longitude}</td>
                    <td>${imageTag}</td>
                    <td>${item.description}</td>
                </tr>`;

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

            // MARKER KE GOOGLE MAP
            if (item.latitude && item.longitude) {
                const position = {
                    lat: parseFloat(item.latitude),
                    lng: parseFloat(item.longitude)
                };

                const marker = new google.maps.Marker({
                    position: position,
                    map: map,
                    title: item.title,
                    icon: {
                        url: "/img/marker.png",
                        scaledSize: new google.maps.Size(32, 32)
                    }
                });

                const infoWindow = new google.maps.InfoWindow({
                    content: `<div style="min-width:150px;">
                            <strong>${item.title}</strong><br/>
                            <span>${item.description}</span><br/>
                            <small><i>${item.latitude}, ${item.longitude}</i></small>
                          </div>`
                });

                marker.addListener("click", () => {
                    infoWindow.open(map, marker);
                });

                markers.push(marker);
            }
        });
    }

    function renderPagination(current, total) {
        let html = `<nav aria-label="Page navigation">`;
        html += `<ul class="pagination justify-content-center">`;

        // Tombol Previous
        if (current > 1) {
            html += `<li class="page-item">
                    <button class="page-link" onclick="goToPage(${current - 1})">Previous</button>
                 </li>`;
        } else {
            html += `<li class="page-item disabled">
                    <span class="page-link">Previous</span>
                 </li>`;
        }

        // Nomor halaman
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

        // Tombol Next
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
