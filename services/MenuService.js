// import axiosInstance from "./axiosConfig";

// export const loadStatusDriverDocument = async () => {
//   try {
//     const res = await axiosInstance.get(
//       "/api/registerDriver/checkRequiredInformation"
//     );

//     console.log("API Response: ", res);

//     if (res.status === 200) {
//       const userInfo = res.data;
//       if (userInfo.code === 200) {
//         return userInfo.data;
//       } else {
//         console.error("Registration Error ", userInfo.message);
//       }
//     }
//   } catch (error) {
//     // console.error("Error during API call:", error);
//   }
//   return null;
// };
