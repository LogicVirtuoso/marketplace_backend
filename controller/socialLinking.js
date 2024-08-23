const twitchLinking = async (req, res) => {
  const authCode = req.body.code;
  const data = new URLSearchParams();
  data.append("client_id", "k55ojmvx9gea310adbb8az98290qrp");
  data.append("client_secret", "naor1yj7tzultytuqbte8b0j7j2apv");
  data.append("code", authCode);
  data.append("grant_type", "authorization_code");
  data.append("redirect_uri", "https://nitrility-ui.vercel.app/twitch-auth");

  try {
    const { default: fetch } = await import("node-fetch");

    const response = await fetch("https://id.twitch.tv/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: data,
    });

    if (!response.ok) {
      return res.status(400).json({
        success: false,
        message: "Bad Request",
      });
    }

    if (response.status === 200) {
      const tokenData = await response.json();
      const profileResponse = await fetch("https://api.twitch.tv/helix/users", {
        headers: {
          "Client-ID": "k55ojmvx9gea310adbb8az98290qrp",
          Authorization: `Bearer ${tokenData.access_token}`,
        },
      });
      if (profileResponse.status === 200) {
        const profileData = {
          id: "",
          login: "",
          email: "",
        };
        const data = await profileResponse.json();
        profileData.id = data.data[0].id;
        profileData.login = data.data[0].login;
        profileData.email = data.data[0].email;

        const fetchUrl2 = `https://api.twitch.tv/helix/users?login=${profileData.login}`;

        const res2 = await fetch(fetchUrl2, {
          method: "GET",
          headers: {
            "Client-ID": "k55ojmvx9gea310adbb8az98290qrp",
            Authorization: `Bearer ${tokenData.access_token}`,
          },
        });

        const profile = await res2.json();
        const profileUrl = profile.data[0].profile_image_url;

        return res.status(200).json({
          success: true,
          message: "User fetching success!",
          profileData,
          profileUrl,
        });
      } else {
        return res.status(500).json({
          success: false,
          message: "Error fetching User",
        });
      }
    } else {
      return res.status(response.status).send({
        success: false,
        message: "Failed to exchange Twitch code for access token",
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error!",
      error: error.message,
    });
  }
};

const instagramLinking = async (req, res) => {
  const code = req.body.code;
  const params = new URLSearchParams();
  params.append("client_id", "2040498642821593");
  params.append("client_secret", "07fd638959f54656f00f2f71d9dee9ce");
  params.append("grant_type", "authorization_code");
  params.append(
    "redirect_uri",
    "https://nitrility-ui.vercel.app/instagram-auth"
  );
  params.append("code", code);

  try {
    const { default: fetch } = await import("node-fetch");

    const response = await fetch(
      "https://api.instagram.com/oauth/access_token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params,
      }
    );
    const data = await response.json();
    const { access_token } = data;

    const response2 = await fetch(
      `https://graph.instagram.com/me?fields=username&access_token=${access_token}`
    );
    const data2 = await response2.json();
    const username = data2.username;

    return res.status(200).json({
      data2,
      username,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Internal Server Error",
      err: err.message,
      err,
    });
  }
};

module.exports = {
  twitchLinking,
  instagramLinking,
};
