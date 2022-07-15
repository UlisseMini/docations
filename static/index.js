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

function createOverlayElement(m) {
  const username = m.nick || m.user.username;
  const avatar = m.avatar || m.user.avatar;

  const defaultNum = m.user.discriminator % 5;
  const avatarURL = avatar
    ? `https://cdn.discordapp.com/avatars/${m.user.id}/${avatar}.png`
    : `https://cdn.discordapp.com/embed/avatars/${defaultNum}.png`;

  let name, img;
  const swap = () => {
    [name.style.display, img.style.display] = [
      img.style.display,
      name.style.display,
    ];
  };

  name = h("div", { onclick: swap, style: "display: none;" }, [username]);
  img = h(
    "img",
    {
      src: avatarURL + "?size=80",
      class: "avatar",
      style: "display: block;",
      title: username,
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

const oauth2URL = `https://discord.com/api/oauth2/authorize?client_id=995090042861133864&redirect_uri=${redirect_uri}&response_type=token&scope=identify%20guilds.members.read`;

function raiseForStatus(resp, body) {
  if (resp.status != 200) {
    const msg = body.msg ? `: ${body.msg}` : "";
    $("#info").textContent = `Error ${resp.statusText}${msg}`;
    if (resp.status == 401) {
      $("#info").textContent += "\n(Refreshing auth in 3s)";
      setTimeout(() => (window.location.href = "/"), 3000);
    }
    throw new Error(`Error, status ${resp.status}`);
  }
}

async function updatePosition(accessToken, tokenType, pos) {
  const resp = await fetch("/pos", {
    method: "POST",
    body: JSON.stringify(pos),
    headers: {
      Authorization: `${tokenType} ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  const body = await resp.json();
  raiseForStatus(resp, body);
  return body;
}

async function getPositions(accessToken, tokenType) {
  const resp = await fetch("/pos", {
    method: "GET",
    headers: {
      Authorization: `${tokenType} ${accessToken}`,
      "Content-Type": "application/json",
    },
  });
  const body = await resp.json();
  raiseForStatus(resp, body);
  return body;
}

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

  // Setup map, get positions of the others and put them on the map.
  const { myId, members } = await getPositions(accessToken, tokenType);
  const overlays = {};
  for (const m of Object.values(members)) {
    overlays[m.user.id] = new ol.Overlay({
      element: createOverlayElement(m),
      positioning: "center-center",
      position: ol.proj.fromLonLat([m.longitude, m.latitude]),
    });
    map.addOverlay(overlays[m.user.id]);
  }

  // Setup Updating location button
  $("#info").textContent = `Update location`;
  $("#info").disabled = false;

  $("#info").addEventListener("click", () => {
    $("#info").textContent = "Getting location...";

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const [lon, lat] = [pos.coords.longitude, pos.coords.latitude];
        map.getView().setCenter(ol.proj.fromLonLat([lon, lat]));
        map.getView().setZoom(5);

        $("#info").textContent = "Updating location...";
        await updatePosition(accessToken, tokenType, {
          latitude: lat,
          longitude: lon,
        });
        overlays[myId].setPosition(ol.proj.fromLonLat([lon, lat]));

        $("#info").textContent = `Update location`;
      },
      (err) => {
        alert(`Failed to get position: ${err.message} (code ${err.code})`);
      }
    );
  });
};
