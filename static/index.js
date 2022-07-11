function $(x) {
  return document.querySelector(x);
}
function h(tag, attrs, children) {
  const el = document.createElement(tag);
  for (const attr in attrs) {
    if (attr.startsWith("on")) {
      el.addEventListener(attr.slice(2), attrs[attr]);
    } else {
      el.setAttribute(attr, attrs[attr]);
    }
  }
  if (children) children.forEach((child) => el.append(child));

  return el;
}

function createOverlayElement(u) {
  let name, img;
  const swap = () => {
    [name.style.display, img.style.display] = [
      img.style.display,
      name.style.display,
    ];
  };

  name = h("div", { onclick: swap, style: "display: none;" }, [u.username]);
  img = h(
    "img",
    {
      src: `https://cdn.discordapp.com/avatars/${u.id}/${u.avatar}.png?size=80`,
      class: "avatar",
      style: "display: block;",
      title: u.username,
      onclick: swap,
    },
    []
  );

  return h("div", {}, [name, img]);
}

const redirect_uri =
  window.location.hostname == "localhost"
    ? encodeURIComponent("http://localhost:8000")
    : encodeURIComponent("https://loc.uli.rocks");

const oauth2URL = `https://discord.com/api/oauth2/authorize?client_id=995090042861133864&redirect_uri=${redirect_uri}&response_type=token&scope=identify%20guilds`;

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
      if (resp.status != 200) {
        const msg = body.msg ? `: ${body.msg}` : "";
        $("#info").textContent = `Error ${resp.statusText}${msg}`;
        if (resp.status == 401) {
          $("#info").textContent += "\n(Refreshing auth in 3s)";
          setTimeout(() => (window.location.href = "/"), 3000);
        }
        return;
      }
      $("#info").textContent = `Success!`;

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
      alert(`Failed to get position: ${err.message} (code ${err.code})`);
    }
  );
};
