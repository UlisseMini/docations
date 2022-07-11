function $(x) {
  return document.querySelector(x);
}

function createOverlayElement(userInfo) {
  const el = document.createElement("span");
  el.textContent = userInfo.username;
  console.log(el);
  return el;
}

window.onload = async () => {
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  const [accessToken, tokenType] = [
    fragment.get("access_token"),
    fragment.get("token_type"),
  ];

  if (!accessToken) {
    return (document.getElementById("login").style.display = "block");
  }

  const map = new ol.Map({
    target: "map",
    layers: [
      new ol.layer.Tile({
        source: new ol.source.OSM(),
      }),
    ],
    view: new ol.View({
      center: ol.proj.fromLonLat([37.41, 8.82]), // <--- africa default
      zoom: 4,
    }),
  });
  console.log(map);

  $("#info").textContent = "Getting location...";
  navigator.geolocation.getCurrentPosition(
    async (pos) => {
      $("#info").textContent = "Getting discord info...";
      const resp = await fetch("/pos", {
        method: "POST",
        body: JSON.stringify({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
        headers: {
          Authorization: `${tokenType} ${accessToken}`,
          "Content-Type": "application/json",
        },
      });
      const body = await resp.json();
      const userInfo = body.userInfo;
      if (resp.status == 200) {
        $("#info").textContent = JSON.stringify(body.userInfo, null, 2);
      } else {
        $("#info").textContent = `Update failed: ${resp.statusText}`;
      }

      const [lon, lat] = [pos.coords.longitude, pos.coords.latitude];
      map.getView().setCenter(ol.proj.fromLonLat([lon, lat]));
      const overlay = new ol.Overlay({
        element: createOverlayElement(userInfo),
      });
      overlay.setPosition(ol.proj.fromLonLat([lon, lat]));
      map.addOverlay(overlay);
    },
    (err) => {
      alert(`Failed to get position: ${err}`);
    }
  );
};
