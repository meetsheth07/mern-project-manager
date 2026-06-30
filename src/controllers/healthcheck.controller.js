import { apiResponse } from "../utils/api-response.js";
import asyncHandler from "../utils/async-handler.js";
// const healthCheck = async (req, res) => {
//     try {
//         const user =await getUserFromDB(); 
//         res.status(200).json(new apiResponse(200, "API is healthy"));   
//     } catch (error) {
//         res.status(500).json(new apiResponse(500, "API is unhealthy", { error: error.message }));
//     }
// };


const healthCheck = asyncHandler(async (req, res) => {
    res.status(200).json(new apiResponse(200, "API is healthy"));
});
export { healthCheck }; 