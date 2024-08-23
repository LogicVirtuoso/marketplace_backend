const { CLIENT_ORIGIN } = require("../config");

// This file is exporting an Object with a single key/value pair.
// However, because this is not a part of the logic of the application
// it makes sense to abstract it to another file. Plus, it is now easily
// extensible if the application needs to send different email templates
// (eg. unsubscribe) in the future.
module.exports = {
  // confirm: (id) => ({
  //   subject: "License Confirm Email",
  //   html: `
  //     <a href='${CLIENT_ORIGIN}/confirm/${id}'>
  //       click to confirm email
  //     </a>
  //   `,
  //   text: `Copy and paste this link: ${CLIENT_ORIGIN}/confirm/${id}`,
  // }),
  confirm: (id, licenseName, licensor, usecase, metadataUrl) => ({
    subject: "License Confirm Email",
    html: `
    <div>
    <p>The title of the song : ${licenseName}</p>
    <p>The issuing licensing authorization : ${licensor}</p>
    <p>The usecase : ${usecase}</p>

      <a href='${CLIENT_ORIGIN}/payment/${id}?metadataUrl=${metadataUrl}'>
        <h4>Click to confirm</h4>
      </a>
      </div>
    `,
    text: `Copy and paste this link: ${CLIENT_ORIGIN}/confirm/${id}`,
  }),

  sendVerificationCode: (code) => ({
    subject: "Nitrility User Sign up Verification Code",
    html: `
      <p>Your Verification Code:</P
      <h3>${code}</h3>
    `,
    text: `Please verify your email now`,
  }),

  signUpConfirm: (id) => ({
    subject: "Nitrility User Sign up Confirm Email",
    html: `
      <a href='${CLIENT_ORIGIN}/confirm/${id}'>
        click to confirm email
      </a>
    `,
    text: `Copy and paste this link: ${CLIENT_ORIGIN}/confirm/${id}`,
  }),

  confirmUpdatingEmail: (token) => ({
    subject: "Nitrility User Confirm Updated Email",
    html: `
      <a href='${CLIENT_ORIGIN}/verify-email/${token}'>
        click to confirm email
      </a>
    `,
    text: `Copy and paste this link: ${CLIENT_ORIGIN}/verify-email/${token}`,
  }),

  sendPdf: () => ({
    subject: "Nitrility User Sign up Confirm Email",
    html: `
      <p>Hi, bro</p>
    `,
    text: `Here is your PDF`,
  }),

  purchase: (licenseName, licensor, usecase) => ({
    subject: "License Purchase Email",
    html: `
    <div>
    <p>The title of the song : ${licenseName}</p>
    <p>The issuing licensing authorization : ${licensor}</p>
    <p>The usecase : ${usecase}</p>
    </div>
    `,
    text: `Copy and paste this link: ${CLIENT_ORIGIN}/confirm/`,
  }),

  report: (spotifyName, reportedBy) => ({
    subject: "Reporting Email",
    html: `
    <div>
    <p>SpotifyName : ${spotifyName}</p>
    <p>ReportedBy : ${reportedBy}</p>
    <p>Please change the password of your spotify account</p>
    </div>
    `,
  }),

  confirmLicenseOwnership: (licenseName, imagePath) => ({
    subject: "License Owenship Confirm Email",
    html: `
    <div>
    <p>The title of the song : <b>${licenseName}</b></p>
    <img src="${imagePath}" alt="${licenseName}" style="width: 40px; object-fit: cover"/>
    </div>
    `,
    text: `Please check the this license on license management tab on nitrilityalpha.com`,
  }),
};
