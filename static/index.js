function $(x) {
  return document.querySelector(x);
}
function createOverlayElement(userInfo) {
  const el = document.createElement("span");
  el.textContent = userInfo.username;
  console.log(el);
  return el;
}

const oauth2URL =
  "https://discord.com/api/oauth2/authorize?client_id=995090042861133864&redirect_uri=http%3A%2F%2Flocalhost%3A8000&response_type=token&scope=identify%20guilds";

window.onload = async () => {
  const fragment = new URLSearchParams(window.location.hash.slice(1));
  const [accessToken, tokenType] = [
    fragment.get("access_token"),
    fragment.get("token_type"),
  ];

  // TODO: Save accessToken in localStorage till it expires
  if (!accessToken) {
    return (window.location = oauth2URL);
  }

  const map = new ol.Map({
    target: "map",
    layers: [
      new ol.layer.Tile({
        source: new ol.source.OSM(),
      }),
    ],
    view: new ol.View({
      center: [0, 0],
      zoom: 0,
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
        $("#info").textContent = `Success!`;
      } else {
        $("#info").textContent = `Update failed: ${resp.statusText}`;
      }

      const [lon, lat] = [pos.coords.longitude, pos.coords.latitude];
      map.getView().setCenter(ol.proj.fromLonLat([lon, lat]));
      map.getView().setZoom(5);
      map.addOverlay(
        new ol.Overlay({
          element: createOverlayElement(userInfo),
          positioning: "center-center",
          position: ol.proj.fromLonLat([lon, lat]),
        })
      );
    },
    (err) => {
      alert(`Failed to get position: ${err}`);
    }
  );
};
