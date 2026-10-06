---
nodeId: 6f373ee0-629c-4a12-8240-c106728c9c74
name: Variational AutoEncoder (VAE)
tags: []
children: []
---

# Variational AutoEncoder (VAE)

(TODO)

Exact Likelihood를 구하지 않고 Approximate 한다.
해당 파이프라인에서는 Likelihood $p(x)$ 를 직접적으로 구하지 못함. 



$$\log p(x) \ge \mathbb{E}_{q(z|x)}[\log p(x|z)] - D_{KL}(q(z|x) || p(z))$$



1. $$\log p(x)$$

  - 우리가 알고 싶은 데이터 확률


2. $$\mathbb{E}_{q(z|x)}[\log p(x|z)] - D_{KL}(q(z|x) || p(z))$$

  - ELBO (Lower Bound)
  - VAE는 이 근사치를 최대로 키음. 