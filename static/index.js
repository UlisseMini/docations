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
};
