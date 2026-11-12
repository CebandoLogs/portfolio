---
title: "Home lab de seguridad"
date: 2026-11-12
summary: "Red segmentada con OPNsense, Active Directory, SIEM y una VLAN aislada para simular ataques y detectarlos."
estado: "En progreso"
tags: ["home-lab", "redes"]
destacado: true
repo: ""
stack: [Proxmox, OPNsense, Active Directory, Sysmon, Wazuh, Suricata]
---

## Qué es

Un entorno propio para practicar lo que hace un SOC: generar actividad real (normal y maliciosa), centralizar los logs y detectar.

## Cómo está armado

| Componente | Rol |
|---|---|
| Proxmox | Hypervisor |
| OPNsense | Firewall, VLANs, IDS (Suricata) |
| Windows Server | Active Directory y DNS |
| Windows 10/11 | Cliente del dominio con Sysmon |
| Ubuntu Server | Servicios Linux (SSH, web) |
| Kali | Atacante, en VLAN aislada |
| Wazuh / Elastic | SIEM |

## Qué demuestra

Configuración de red y segmentación, despliegue de un SIEM y la capacidad de generar y analizar telemetría propia.

<!-- Agregá el diagrama de red cuando lo tengas: ![Diagrama](diagrama.png) -->
