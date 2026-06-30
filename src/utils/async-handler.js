const asyncHandler = (requestHandler) => {
    return async (req, res, next) => {
        return (req,res,next) => {
            promise.resolve(requestHandler(req, res, next)).catch(next);
        }
}
}


export default asyncHandler;