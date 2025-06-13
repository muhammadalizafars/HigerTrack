let markers = [];
let map;

function initMap() {
  var center = { lat: -6.914744, lng: 107.60981 };
  map = new google.maps.Map(document.getElementById("map"), {
    zoom: 10,
    center: center,
  });

}
 
function updateTable() {
  const tbody = document.querySelector("#markerTable tbody");

  tbody.innerHTML = "";
  markers.forEach((marker, idx) => {
    const lat = marker.getPosition().lat().toFixed(6);
    const lng = marker.getPosition().lng().toFixed(6);
    const row = `<tr><td>${idx + 1}</td><td>${lat}</td><td>${lng}</td></tr>`;
    tbody.insertAdjacentHTML("beforeend", row);
  });
}

window.onload = initMap;
