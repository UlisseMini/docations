function $(x) {
  return document.querySelector(x);
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

  const resp = await fetch("https://discord.com/api/users/@me", {
    headers: {
      authorization: `${tokenType} ${accessToken}`,
    },
  });
  const { username, discriminator } = await resp.json();
  $("#info").textContent = `Hello ${username}#${discriminator}`;

  navigator.geolocation.getCurrentPosition(
    async (pos) => {
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
      if (resp.status == 200) {
        $("#info").textContent = "Location Updated successfully";
      } else {
        $("#info").textContent = `Update failed: ${resp.statusText}`;
      }
    },
    (err) => {
      alert(`Failed to get position: ${err}`);
    }
  );
};
