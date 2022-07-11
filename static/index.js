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
  window.onerror = (e) => ($("#info").textContent = `Error: ${e}`);

  const fragment = new URLSearchParams(window.location.hash.slice(1));
  const [accessToken, tokenType] = [
    fragment.get("access_token"),
    fragment.get("token_type"),
  ];

  // TODO: Save accessToken in localStorage till it expires (url works for now)
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
      const [lon, lat] = [pos.coords.longitude, pos.coords.latitude];
      map.getView().setCenter(ol.proj.fromLonLat([lon, lat]));
      map.getView().setZoom(5);

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
      if (resp.status == 200) {
        $("#info").textContent = `Success!`;
      } else {
        const msg = ": " + (body.msg || "");
        $("#info").textContent = `Error ${resp.statusText}${msg}`;
        return;
      }

      Object.values(body.users).forEach((u) => {
        map.addOverlay(
          new ol.Overlay({
            element: createOverlayElement(u),
            positioning: "center-center",
            position: ol.proj.fromLonLat([u.longitude, u.latitude]),
          })
        );
      });
    },
    (err) => {
      alert(`Failed to get position: ${err}`);
    }
  );
};
