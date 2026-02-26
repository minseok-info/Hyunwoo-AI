---
nodeId: 37e245b8-5923-4b1a-83c4-2c6d39167471
treeId: 7ef1f5e1-15d4-4101-9e0f-5a55445e5424
name: Gaussian Mixture Model (GMM)
tags: []
---
# Gaussian Mixture Model (GMM)

$$p(x) = \sum_{k=1}^{K} \pi_k \mathcal{N}(x | \mu_k, \Sigma_k)$$

데이터 $x$가 나타날 확률 = $K$개의 가우시안 분포를 가중치만큼 더한 것

- $\pi_k$: 혼합 계수 (Mixing Coefficient). $k$번째 가우시안이 전체에서 차지하는 비중 ($\sum \pi_k = 1$을 만족해야 함)
- $\mathcal{N}(x | \mu_k, \Sigma_k)$: $k$번째 가우시안 분포. 평균($\mu_k$)과 공분산($\Sigma_k$)을 가진다.
