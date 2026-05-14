export const successResponse = (res, data = null, message = "Success", statusCode = 200, meta) =>
  res.status(statusCode).json({
    success: true,
    message,
    data,
    ...(meta ? { meta } : {}),
  });

export const errorResponse = (res, message = "Something went wrong", statusCode = 500, errors) =>
  res.status(statusCode).json({
    success: false,
    message,
    ...(errors ? { errors } : {}),
  });
