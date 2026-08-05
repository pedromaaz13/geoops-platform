# ADR-002 · Monolito modular para M0

## Estado

Aceptado.

## Decisión

FastAPI, ingesta y dominio se organizan modularmente, sin microservicios
independientes durante M0.

## Motivo

Reduce despliegue, observabilidad y coordinación sin impedir separar módulos
cuando exista una necesidad medida.
