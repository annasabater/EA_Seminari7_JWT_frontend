import { HttpEvent, HttpHandlerFn, HttpRequest } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { Observable, throwError } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { AuthService } from './auth.service';

export function jwtInterceptor(req: HttpRequest<unknown>, next: HttpHandlerFn): Observable<HttpEvent<unknown>> {
  
  console.log("Dentro del interceptador");

  const token = localStorage.getItem('access_token');
  const router = inject(Router);
  const toastr = inject(ToastrService);
  const authService = inject(AuthService);

  if (token) {
    req = req.clone({
      setHeaders: {
        Authorization: `Bearer ${token}`
      }
    });
  }

  return next(req).pipe(
    catchError((error) => {
      if (error.status === 401) {
        // Quan es rep un 401, intentar renovar el token
        return authService.refreshToken().pipe(
          switchMap((tokenResponse: any) => {
            if (tokenResponse && tokenResponse.access_token) {
              // Actualitza l'access token
              localStorage.setItem('access_token', tokenResponse.access_token);
              // Torna a clonar la petició original amb el nou token
              const newReq = req.clone({
                setHeaders: {
                  Authorization: `Bearer ${tokenResponse.access_token}`
                }
              });
              return next(newReq);
            } else {
              localStorage.removeItem('access_token');
              localStorage.removeItem('refresh_token');
              toastr.error(
                'Su sesión ha expirado. Por favor, inicie sesión nuevamente.',
                'Sesión Expirada',
                {
                  timeOut: 3000,
                  closeButton: true
                }
              );
              router.navigate(['/login']);
              return throwError(() => error);
            }
          }),
          catchError(err => {
            // Si falla la renovació, neteja els tokens i redirigeix
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            toastr.error(
              'Su sesión ha expirado. Por favor, inicie sesión nuevamente.',
              'Sesión Expirada',
              {
                timeOut: 3000,
                closeButton: true
              }
            );
            router.navigate(['/login']);
            return throwError(() => err);
          })
        );
      }
      return throwError(() => error);
    })
  );
}
