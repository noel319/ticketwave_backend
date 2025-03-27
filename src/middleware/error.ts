import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
};

export const notFound = (req: Request, res: Response) => {
  res.status(404).json({ message: 'Route not found' });
};